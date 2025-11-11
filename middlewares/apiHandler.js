/**
 * Gestionnaire des routes API Express
 * Routes : GET /, POST /send, POST /webhook
 */

import { isClientReady, getClientInfo } from '../services/whatsappClient.js';
import { sendMessage, sendBulkMessages } from '../services/messageService.js';
import { asyncHandler, createHttpError } from './errorHandler.js';
import { getWorkerStats } from '../queue/queueWorker.js';

/**
 * Route GET / - Status du serveur
 */
export const healthCheck = asyncHandler(async (req, res) => {
  const clientReady = isClientReady();
  const clientInfo = getClientInfo();
  const queueStats = getWorkerStats();

  res.json({
    success: true,
    message: 'Server OK ✅',
    status: {
      whatsapp: clientReady ? 'connected' : 'disconnected',
      client: clientInfo,
      queue: queueStats
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Route POST /send - Envoi de message
 * Body: { number: "229XXXXXXXX", message: "Hello !" }
 */
export const sendMessageHandler = asyncHandler(async (req, res) => {
  // Vérifie si le client est prêt
  if (!isClientReady()) {
    throw createHttpError(503, 'Client WhatsApp non connecté. Veuillez réessayer dans quelques instants.');
  }

  // Validation du corps de la requête
  const { number, message } = req.body;

  if (!number) {
    throw createHttpError(400, 'Le champ "number" est requis');
  }

  if (!message) {
    throw createHttpError(400, 'Le champ "message" est requis');
  }

  if (typeof message !== 'string' || message.trim().length === 0) {
    throw createHttpError(400, 'Le message ne peut pas être vide');
  }

  // Validation du numéro
  const cleanNumber = number.replace(/\D/g, '');
  if (cleanNumber.length < 8 || cleanNumber.length > 15) {
    throw createHttpError(400, 'Format de numéro invalide');
  }

  // Envoi du message
  try {
    const result = await sendMessage(number, message);

    res.json({
      success: true,
      message: 'Message envoyé avec succès',
      data: result
    });
  } catch (error) {
    throw createHttpError(500, `Échec de l'envoi: ${error.message}`);
  }
});

/**
 * Route POST /send/bulk - Envoi de messages groupés
 * Body: { numbers: ["229XXX", "229YYY"], message: "Hello !" }
 */
export const sendBulkHandler = asyncHandler(async (req, res) => {
  if (!isClientReady()) {
    throw createHttpError(503, 'Client WhatsApp non connecté');
  }

  const { numbers, message } = req.body;

  if (!Array.isArray(numbers) || numbers.length === 0) {
    throw createHttpError(400, 'Le champ "numbers" doit être un tableau non vide');
  }

  if (!message || typeof message !== 'string') {
    throw createHttpError(400, 'Le champ "message" est requis');
  }

  // Limite le nombre d'envois groupés
  if (numbers.length > 50) {
    throw createHttpError(400, 'Maximum 50 destinataires par requête');
  }

  try {
    const results = await sendBulkMessages(numbers, message);

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    res.json({
      success: true,
      message: `${successCount} message(s) envoyé(s), ${failureCount} échec(s)`,
      data: {
        total: results.length,
        success: successCount,
        failures: failureCount,
        results
      }
    });
  } catch (error) {
    throw createHttpError(500, `Échec de l'envoi groupé: ${error.message}`);
  }
});

/**
 * Route POST /webhook - Webhook pour recevoir des notifications
 * Peut être utilisé par des services externes
 */
export const webhookHandler = asyncHandler(async (req, res) => {
  console.log('🔔 [Webhook] Notification reçue:', req.body);

  // Traitement personnalisé du webhook
  const { event, data } = req.body;

  // Exemple de traitement
  if (event === 'send_message' && data?.number && data?.message) {
    await sendMessage(data.number, data.message);
  }

  res.json({
    success: true,
    message: 'Webhook traité',
    received: req.body
  });
});

/**
 * Route GET /queue/stats - Statistiques de la file d'attente
 */
export const queueStatsHandler = asyncHandler(async (req, res) => {
  const stats = getWorkerStats();

  res.json({
    success: true,
    data: stats
  });
});

/**
 * Route GET /client/info - Informations du client WhatsApp
 */
export const clientInfoHandler = asyncHandler(async (req, res) => {
  if (!isClientReady()) {
    throw createHttpError(503, 'Client WhatsApp non connecté');
  }

  const info = getClientInfo();

  res.json({
    success: true,
    data: info
  });
});

export default {
  healthCheck,
  sendMessageHandler,
  sendBulkHandler,
  webhookHandler,
  queueStatsHandler,
  clientInfoHandler
};
