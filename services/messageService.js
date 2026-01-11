/**
 * Service de haut niveau pour l'envoi et la réception de messages WhatsApp
 */

import { getClient, isClientReady } from './whatsappClient.js';
import { enqueueWithRetry } from '../queue/queueWorker.js';
import { pongMessage, helpMessage, infoMessage, unknownCommandMessage } from '../format/messageTemplates.js';

/**
 * Formate un numéro de téléphone au format WhatsApp
 * @param {string} number - Numéro au format international (ex: 229XXXXXXXX)
 * @returns {string} ID de chat WhatsApp (ex: 229XXXXXXXX@c.us)
 */
export function formatPhoneNumber(number) {
  // Supprime tous les caractères non numériques
  let cleaned = number.replace(/\D/g, '');

  // Ajoute le suffixe WhatsApp
  return `${cleaned}@c.us`;
}

/**
 * Vérifie si un numéro existe sur WhatsApp
 * @param {string} number - Numéro à vérifier
 * @returns {Promise<boolean>} True si le numéro existe
 */
export async function isNumberRegistered(number) {
  const client = getClient();
  if (!isClientReady() || !client) {
    throw new Error('Client WhatsApp non prêt');
  }

  try {
    const chatId = formatPhoneNumber(number);
    const isRegistered = await client.isRegisteredUser(chatId);
    return isRegistered;
  } catch (error) {
    console.error('❌ [MessageService] Erreur vérification numéro:', error.message);
    return false;
  }
}

/**
 * Envoie un message WhatsApp
 * @param {string} number - Numéro du destinataire
 * @param {string} message - Message à envoyer
 * @returns {Promise<Object>} Résultat de l'envoi
 */
export async function sendMessage(number, message) {
  if (!isClientReady()) {
    throw new Error('Client WhatsApp non connecté');
  }

  const client = getClient();
  const chatId = formatPhoneNumber(number);

  // Vérifie si le numéro existe
  const exists = await isNumberRegistered(number);
  if (!exists) {
    throw new Error(`Le numéro ${number} n'est pas enregistré sur WhatsApp`);
  }

  // Enqueue la tâche d'envoi
  return await enqueueWithRetry(
    async () => {
      console.log(`📤 [MessageService] Envoi vers ${number}:`, message.substring(0, 50) + '...');
      const result = await client.sendMessage(chatId, message);
      console.log(`✅ [MessageService] Message envoyé avec succès à ${number}`);
      return {
        success: true,
        messageId: result.id._serialized,
        timestamp: result.timestamp,
        to: number
      };
    },
    {
      taskName: `Envoi message à ${number}`,
      maxRetries: 3
    }
  );
}

/**
 * Envoie un message à plusieurs destinataires
 * @param {string[]} numbers - Tableau de numéros
 * @param {string} message - Message à envoyer
 * @returns {Promise<Object[]>} Résultats des envois
 */
export async function sendBulkMessages(numbers, message) {
  console.log(`📨 [MessageService] Envoi groupé vers ${numbers.length} destinataires`);

  const results = [];

  for (const number of numbers) {
    try {
      const result = await sendMessage(number, message);
      results.push({ number, ...result });
    } catch (error) {
      console.error(`❌ [MessageService] Échec envoi à ${number}:`, error.message);
      results.push({
        number,
        success: false,
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Gère les messages entrants
 * @param {Object} message - Objet message de whatsapp-web.js
 */
export async function handleIncomingMessage(message) {
  try {
    // Récupération des informations avec gestion d'erreur
    let contact = null;
    let chat = null;

    try {
      contact = await message.getContact();
    } catch (contactError) {
      console.warn('⚠️ [MessageService] Impossible de récupérer le contact:', contactError.message);
      // Utiliser les infos disponibles depuis le message directement
      contact = {
        pushname: message.from,
        number: message.from.replace('@c.us', ''),
        name: 'Inconnu'
      };
    }

    try {
      chat = await message.getChat();
    } catch (chatError) {
      console.warn('⚠️ [MessageService] Impossible de récupérer le chat:', chatError.message);
      // Créer un objet chat minimal
      chat = {
        isGroup: message.from.includes('@g.us'),
        id: { _serialized: message.from }
      };
    }

    const contactName = contact.pushname || contact.name || contact.number || 'Inconnu';
    console.log(`📥 [MessageService] Message reçu de ${contactName}:`, message.body);

    // Ignore les messages de groupes si nécessaire
    if (chat.isGroup) {
      console.log('👥 [MessageService] Message de groupe ignoré');
      return;
    }

    // Traitement des commandes
    const command = message.body.toLowerCase().trim();

    try {
      switch (command) {
        case 'ping':
          await message.reply(pongMessage());
          console.log('🏓 [MessageService] Réponse "pong" envoyée');
          break;

        case 'aide':
        case 'help':
          await message.reply(helpMessage());
          console.log('ℹ️ [MessageService] Message d\'aide envoyé');
          break;

        case 'info':
          await message.reply(infoMessage());
          console.log('📋 [MessageService] Informations envoyées');
          break;

        default:
          // Pour les autres messages, on peut choisir de ne rien faire
          // ou d'envoyer un message de commande inconnue
          if (command.startsWith('/') || command.startsWith('!')) {
            await message.reply(unknownCommandMessage());
          }
          break;
      }
    } catch (replyError) {
      console.error('❌ [MessageService] Erreur envoi réponse:', replyError.message);
    }
  } catch (error) {
    console.error('❌ [MessageService] Erreur traitement message:', error.message);
    // Ne pas laisser l'erreur remonter pour éviter les "Unhandled Promise"
  }
}

/**
 * Obtient les informations d'un chat
 * @param {string} number - Numéro du contact
 * @returns {Promise<Object>} Informations du chat
 */
export async function getChatInfo(number) {
  const client = getClient();
  if (!isClientReady() || !client) {
    throw new Error('Client WhatsApp non prêt');
  }

  const chatId = formatPhoneNumber(number);
  const chat = await client.getChatById(chatId);

  return {
    id: chat.id._serialized,
    name: chat.name,
    isGroup: chat.isGroup,
    unreadCount: chat.unreadCount,
    lastMessage: chat.lastMessage?.body || null
  };
}

export default {
  formatPhoneNumber,
  isNumberRegistered,
  sendMessage,
  sendBulkMessages,
  handleIncomingMessage,
  getChatInfo
};
