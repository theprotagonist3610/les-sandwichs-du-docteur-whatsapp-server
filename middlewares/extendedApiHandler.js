/**
 * Gestionnaires API étendus pour nouvelles fonctionnalités
 * Routes: messages, contacts, media, qr
 */

import { getClient, isClientReady, getLatestQrCode } from '../services/whatsappClient.js';
import { asyncHandler, createHttpError } from './errorHandler.js';
import { hasPermission } from '../services/apiKeyService.js';
import QRCode from 'qrcode';
import multer from 'multer';
import pkg from 'whatsapp-web.js';
const { MessageMedia } = pkg;
import { readFileSync, unlinkSync } from 'fs';

// Configuration multer pour l'upload de fichiers
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 16 * 1024 * 1024 // 16MB max
  },
  fileFilter: (req, file, cb) => {
    // Types de fichiers acceptés
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/3gpp',
      'audio/mpeg',
      'audio/ogg',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Type de fichier non supporté: ${file.mimetype}`));
    }
  }
});

export const uploadMiddleware = upload.single('file');

/**
 * GET /api/messages/:chatId - Récupère l'historique des messages d'un chat
 */
export const getMessagesHandler = asyncHandler(async (req, res) => {
  if (!isClientReady()) {
    throw createHttpError(503, 'Client WhatsApp non connecté');
  }

  const { chatId } = req.params;
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  if (!chatId) {
    throw createHttpError(400, 'chatId est requis');
  }

  const client = getClient();

  try {
    // Formate le chat ID
    const formattedChatId = chatId.includes('@') ? chatId : `${chatId}@c.us`;

    // Récupère le chat
    const chat = await client.getChatById(formattedChatId);

    // Récupère les messages
    const messages = await chat.fetchMessages({ limit: limit + offset });

    // Applique l'offset et limite
    const paginatedMessages = messages.slice(offset, offset + limit);

    // Formate les messages
    const formattedMessages = paginatedMessages.map(msg => ({
      id: msg.id._serialized,
      from: msg.from,
      to: msg.to,
      body: msg.body,
      type: msg.type,
      timestamp: msg.timestamp,
      fromMe: msg.fromMe,
      hasMedia: msg.hasMedia,
      ack: msg.ack,
      isForwarded: msg.isForwarded,
      isStarred: msg.isStarred
    }));

    res.json({
      success: true,
      data: {
        chatId: formattedChatId,
        total: messages.length,
        offset,
        limit,
        messages: formattedMessages
      }
    });
  } catch (error) {
    throw createHttpError(500, `Erreur lors de la récupération des messages: ${error.message}`);
  }
});

/**
 * DELETE /api/messages/:messageId - Supprime un message
 */
export const deleteMessageHandler = asyncHandler(async (req, res) => {
  if (!isClientReady()) {
    throw createHttpError(503, 'Client WhatsApp non connecté');
  }

  // Vérifie la permission
  if (req.apiKeyData && !hasPermission(req.apiKeyData, 'admin')) {
    throw createHttpError(403, 'Permission insuffisante');
  }

  const { messageId } = req.params;
  const { everyone } = req.body; // Supprimer pour tout le monde?

  if (!messageId) {
    throw createHttpError(400, 'messageId est requis');
  }

  const client = getClient();

  try {
    // Récupère le message
    const message = await client.getMessageById(messageId);

    if (!message) {
      throw createHttpError(404, 'Message introuvable');
    }

    // Supprime le message
    await message.delete(everyone === true);

    res.json({
      success: true,
      message: 'Message supprimé avec succès',
      data: {
        messageId,
        deletedForEveryone: everyone === true
      }
    });
  } catch (error) {
    throw createHttpError(500, `Erreur lors de la suppression: ${error.message}`);
  }
});

/**
 * GET /api/contacts - Liste tous les contacts
 */
export const getContactsHandler = asyncHandler(async (req, res) => {
  if (!isClientReady()) {
    throw createHttpError(503, 'Client WhatsApp non connecté');
  }

  const client = getClient();

  try {
    // Récupère tous les contacts
    const contacts = await client.getContacts();

    // Filtre et formate
    const formattedContacts = contacts
      .filter(contact => !contact.isGroup && !contact.isMe)
      .map(contact => ({
        id: contact.id._serialized,
        number: contact.number,
        name: contact.name || contact.pushname || 'Unknown',
        pushname: contact.pushname,
        isMyContact: contact.isMyContact,
        isWAContact: contact.isWAContact,
        profilePicUrl: contact.profilePicUrl || null
      }));

    res.json({
      success: true,
      data: {
        total: formattedContacts.length,
        contacts: formattedContacts
      }
    });
  } catch (error) {
    throw createHttpError(500, `Erreur lors de la récupération des contacts: ${error.message}`);
  }
});

/**
 * GET /api/contacts/:contactId - Récupère les infos d'un contact
 */
export const getContactHandler = asyncHandler(async (req, res) => {
  if (!isClientReady()) {
    throw createHttpError(503, 'Client WhatsApp non connecté');
  }

  const { contactId } = req.params;

  if (!contactId) {
    throw createHttpError(400, 'contactId est requis');
  }

  const client = getClient();

  try {
    const formattedId = contactId.includes('@') ? contactId : `${contactId}@c.us`;
    const contact = await client.getContactById(formattedId);

    res.json({
      success: true,
      data: {
        id: contact.id._serialized,
        number: contact.number,
        name: contact.name || contact.pushname || 'Unknown',
        pushname: contact.pushname,
        isMyContact: contact.isMyContact,
        isWAContact: contact.isWAContact,
        isGroup: contact.isGroup,
        profilePicUrl: contact.profilePicUrl || null,
        about: await contact.getAbout() || null
      }
    });
  } catch (error) {
    throw createHttpError(500, `Erreur lors de la récupération du contact: ${error.message}`);
  }
});

/**
 * POST /api/media/send - Envoie un média (image, vidéo, document)
 */
export const sendMediaHandler = asyncHandler(async (req, res) => {
  if (!isClientReady()) {
    throw createHttpError(503, 'Client WhatsApp non connecté');
  }

  const { number, caption } = req.body;
  const file = req.file;

  if (!number) {
    throw createHttpError(400, 'Le champ "number" est requis');
  }

  if (!file) {
    throw createHttpError(400, 'Aucun fichier fourni');
  }

  const client = getClient();

  try {
    // Formate le numéro
    const chatId = number.includes('@') ? number : `${number}@c.us`;

    // Lit le fichier
    const fileData = readFileSync(file.path, { encoding: 'base64' });

    // Crée le média
    const media = new MessageMedia(file.mimetype, fileData, file.originalname);

    console.log(`📤 [API] Envoi média vers ${number}: ${file.originalname}`);

    // Envoie le média
    const message = await client.sendMessage(chatId, media, {
      caption: caption || ''
    });

    // Supprime le fichier temporaire
    unlinkSync(file.path);

    res.json({
      success: true,
      message: 'Média envoyé avec succès',
      data: {
        messageId: message.id._serialized,
        to: number,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        caption: caption || null
      }
    });
  } catch (error) {
    // Nettoie le fichier en cas d'erreur
    if (file && file.path) {
      try {
        unlinkSync(file.path);
      } catch (e) {
        console.error('Erreur nettoyage fichier:', e);
      }
    }
    throw createHttpError(500, `Erreur lors de l'envoi du média: ${error.message}`);
  }
});

/**
 * GET /api/qr - Récupère le QR code de connexion (image PNG)
 */
export const getQrCodeHandler = asyncHandler(async (req, res) => {
  // Si déjà connecté
  if (isClientReady()) {
    // Retourner une page HTML simple
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>WhatsApp Connecté</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
          }
          .container {
            text-align: center;
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            max-width: 400px;
          }
          .success-icon {
            font-size: 80px;
            margin-bottom: 20px;
          }
          h1 {
            color: #25D366;
            margin: 0 0 10px 0;
          }
          p {
            color: #666;
            line-height: 1.6;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✅</div>
          <h1>WhatsApp Connecté</h1>
          <p>Votre client WhatsApp est déjà connecté et prêt à l'emploi.</p>
          <p style="margin-top: 20px; font-size: 14px; color: #999;">
            Aucun QR code nécessaire.
          </p>
        </div>
      </body>
      </html>
    `;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  }

  // Récupérer le dernier QR code
  const qrData = getLatestQrCode();

  if (!qrData) {
    // Retourner une page d'attente
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>QR Code WhatsApp</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
          }
          .container {
            text-align: center;
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            max-width: 400px;
          }
          .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #25D366;
            border-radius: 50%;
            width: 60px;
            height: 60px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          h1 {
            color: #25D366;
            margin: 0 0 10px 0;
          }
          p {
            color: #666;
            line-height: 1.6;
          }
          .refresh-btn {
            margin-top: 20px;
            padding: 12px 24px;
            background: #25D366;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            transition: background 0.3s;
          }
          .refresh-btn:hover {
            background: #128C7E;
          }
        </style>
        <script>
          setTimeout(() => window.location.reload(), 3000);
        </script>
      </head>
      <body>
        <div class="container">
          <div class="spinner"></div>
          <h1>Génération du QR Code...</h1>
          <p>Le serveur WhatsApp est en cours d'initialisation.</p>
          <p style="font-size: 14px; color: #999;">Actualisation automatique dans 3 secondes...</p>
          <button class="refresh-btn" onclick="window.location.reload()">Actualiser maintenant</button>
        </div>
      </body>
      </html>
    `;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  }

  // Générer l'image PNG du QR code
  try {
    // Option: retourner directement l'image PNG
    const format = req.query.format || 'html';

    if (format === 'png') {
      // Retourner l'image PNG brute
      const qrImage = await QRCode.toBuffer(qrData, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      res.setHeader('Content-Type', 'image/png');
      return res.send(qrImage);
    }

    // Par défaut: retourner une page HTML avec le QR code
    const qrDataUrl = await QRCode.toDataURL(qrData, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>QR Code WhatsApp</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
          }
          .container {
            text-align: center;
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            max-width: 500px;
          }
          .qr-code {
            background: white;
            padding: 20px;
            border-radius: 12px;
            display: inline-block;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            margin-bottom: 20px;
          }
          .qr-code img {
            display: block;
            width: 300px;
            height: 300px;
          }
          h1 {
            color: #25D366;
            margin: 0 0 10px 0;
            font-size: 28px;
          }
          .instructions {
            color: #666;
            line-height: 1.8;
            text-align: left;
            margin: 20px 0;
          }
          .instructions ol {
            padding-left: 20px;
          }
          .instructions li {
            margin: 8px 0;
          }
          .warning {
            background: #FFF3CD;
            border: 1px solid #FFE69C;
            border-radius: 8px;
            padding: 12px;
            margin-top: 20px;
            color: #856404;
            font-size: 14px;
          }
          .refresh-info {
            color: #999;
            font-size: 12px;
            margin-top: 15px;
          }
        </style>
        <script>
          // Auto-refresh toutes les 30 secondes pour obtenir un nouveau QR si expiré
          setTimeout(() => window.location.reload(), 30000);
        </script>
      </head>
      <body>
        <div class="container">
          <h1>📱 Scanner le QR Code</h1>

          <div class="qr-code">
            <img src="${qrDataUrl}" alt="QR Code WhatsApp">
          </div>

          <div class="instructions">
            <strong>Comment scanner :</strong>
            <ol>
              <li>Ouvrez WhatsApp sur votre téléphone</li>
              <li>Allez dans <strong>Menu</strong> ou <strong>Paramètres</strong></li>
              <li>Touchez <strong>Appareils connectés</strong></li>
              <li>Touchez <strong>Connecter un appareil</strong></li>
              <li>Pointez votre téléphone vers cet écran pour scanner le code</li>
            </ol>
          </div>

          <div class="warning">
            ⚠️ Le QR code expire après 60 secondes. La page s'actualise automatiquement.
          </div>

          <div class="refresh-info">
            Actualisation automatique dans 30 secondes...
          </div>
        </div>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);

  } catch (error) {
    throw createHttpError(500, `Erreur lors de la génération du QR code: ${error.message}`);
  }
});

/**
 * GET /api/chats - Liste tous les chats
 */
export const getChatsHandler = asyncHandler(async (req, res) => {
  if (!isClientReady()) {
    throw createHttpError(503, 'Client WhatsApp non connecté');
  }

  const client = getClient();

  try {
    const chats = await client.getChats();

    const formattedChats = chats.map(chat => ({
      id: chat.id._serialized,
      name: chat.name,
      isGroup: chat.isGroup,
      isReadOnly: chat.isReadOnly,
      unreadCount: chat.unreadCount,
      timestamp: chat.timestamp,
      archived: chat.archived,
      pinned: chat.pinned,
      muteExpiration: chat.muteExpiration
    }));

    res.json({
      success: true,
      data: {
        total: formattedChats.length,
        chats: formattedChats
      }
    });
  } catch (error) {
    throw createHttpError(500, `Erreur lors de la récupération des chats: ${error.message}`);
  }
});

export default {
  getMessagesHandler,
  deleteMessageHandler,
  getContactsHandler,
  getContactHandler,
  sendMediaHandler,
  getQrCodeHandler,
  getChatsHandler,
  uploadMiddleware
};
