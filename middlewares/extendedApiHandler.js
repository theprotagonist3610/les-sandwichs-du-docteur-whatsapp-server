/**
 * Gestionnaires API étendus pour nouvelles fonctionnalités
 * Routes: messages, contacts, media, qr
 */

import { getClient, isClientReady } from '../services/whatsappClient.js';
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
 * GET /api/qr - Récupère le QR code de connexion
 */
export const getQrCodeHandler = asyncHandler(async (req, res) => {
  // Cette route nécessite une gestion spéciale car le QR code
  // est généré uniquement au démarrage avant la connexion

  if (isClientReady()) {
    return res.json({
      success: true,
      message: 'Client déjà connecté',
      connected: true
    });
  }

  // Pour obtenir un nouveau QR code, il faut redémarrer la session
  // ou implémenter un système de stockage du dernier QR
  res.json({
    success: false,
    message: 'QR code non disponible. Le client n\'est pas en phase de connexion.',
    info: 'Redémarrez le serveur pour obtenir un nouveau QR code'
  });
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
