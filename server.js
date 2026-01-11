/**
 * Serveur WhatsApp avec API REST
 * H�berg� sur Render - Compatible Free Tier
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';

// Services WhatsApp
import { initializeWhatsApp, getClient } from './services/whatsappClient.js';
import { handleIncomingMessage } from './services/messageService.js';

// Middlewares
import { authMiddleware, logAccess } from './middlewares/authMiddleware.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import {
  createApiKeyRateLimiter,
  createBulkSendRateLimiter,
  rateLimitLogger
} from './middlewares/rateLimitMiddleware.js';
import {
  healthCheck,
  sendMessageHandler,
  sendBulkHandler,
  webhookHandler,
  queueStatsHandler,
  clientInfoHandler
} from './middlewares/apiHandler.js';
import {
  getMessagesHandler,
  deleteMessageHandler,
  getContactsHandler,
  getContactHandler,
  sendMediaHandler,
  getQrCodeHandler,
  getChatsHandler,
  uploadMiddleware
} from './middlewares/extendedApiHandler.js';

// Configuration
const PORT = process.env.PORT || 3000;
const app = express();

// Middlewares globaux de sécurité
app.use(helmet({
  contentSecurityPolicy: false, // Désactivé pour compatibilité API
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logger HTTP (désactivé en production pour économiser les ressources)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use(logAccess);

// Rate limiting global
const globalRateLimit = createApiKeyRateLimiter();
app.use(globalRateLimit);
app.use(rateLimitLogger);

// Routes publiques
app.get('/', healthCheck);

// Rate limiter spécifique pour les envois en masse
const bulkRateLimit = createBulkSendRateLimiter();

// Routes protégées par authentification
app.post('/send', authMiddleware, sendMessageHandler);
app.post('/send/bulk', authMiddleware, bulkRateLimit, sendBulkHandler);
app.post('/webhook', authMiddleware, webhookHandler);
app.get('/queue/stats', authMiddleware, queueStatsHandler);
app.get('/client/info', authMiddleware, clientInfoHandler);

// Nouveaux endpoints API
app.get('/api/messages/:chatId', authMiddleware, getMessagesHandler);
app.delete('/api/messages/:messageId', authMiddleware, deleteMessageHandler);
app.get('/api/contacts', authMiddleware, getContactsHandler);
app.get('/api/contacts/:contactId', authMiddleware, getContactHandler);
app.get('/api/chats', authMiddleware, getChatsHandler);
app.post('/api/media/send', authMiddleware, uploadMiddleware, sendMediaHandler);
// QR code endpoint sans authentification (nécessaire pour la première connexion)
app.get('/api/qr', getQrCodeHandler);

// Gestionnaire 404
app.use(notFoundHandler);

// Gestionnaire d'erreurs global
app.use(errorHandler);

/**
 * Initialise le serveur et le client WhatsApp
 */
async function startServer() {
  console.log('=� D�marrage du serveur WhatsApp...');
  console.log('');

  // V�rification de la configuration
  if (!process.env.API_KEY) {
    console.error('L ERREUR: API_KEY non d�finie dans .env');
    console.error('=� Cr�ez un fichier .env avec : API_KEY=votre_cle_secrete');
    process.exit(1);
  }

  try {
    // D�marre le serveur Express
    app.listen(PORT, () => {
      console.log(' Serveur Express d�marr�');
      console.log(`=� Port: ${PORT}`);
      console.log(`< URL: http://localhost:${PORT}`);
      console.log('');
    });

    // Initialise le client WhatsApp
    console.log('=� Initialisation du client WhatsApp...');
    await initializeWhatsApp();

    // Configure les gestionnaires de messages
    const client = getClient();
    if (client) {
      client.on('message', handleIncomingMessage);
      console.log(' Gestionnaires de messages configur�s');
      console.log('');
      console.log('PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP');
      console.log(' SERVEUR PR�T');
      console.log('PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP');
      console.log('');
      console.log('=� Testez l\'API avec:');
      console.log('   curl -X POST http://localhost:' + PORT + '/send \\');
      console.log('   -H "Content-Type: application/json" \\');
      console.log('   -H "x-api-key: ' + process.env.API_KEY + '" \\');
      console.log('   -d \'{"number":"229XXXXXXXX","message":"Test"}\'');
      console.log('');
    }
  } catch (error) {
    console.error('L Erreur lors du d�marrage:', error);
    process.exit(1);
  }
}

/**
 * Gestion de l'arr�t propre du serveur
 */
function setupGracefulShutdown() {
  const signals = ['SIGTERM', 'SIGINT'];

  signals.forEach(signal => {
    process.on(signal, async () => {
      console.log('');
      console.log(`\n=� Signal ${signal} re�u, arr�t du serveur...`);

      try {
        const client = getClient();
        if (client) {
          await client.destroy();
          console.log(' Client WhatsApp d�connect�');
        }

        console.log('=K Serveur arr�t� proprement');
        process.exit(0);
      } catch (error) {
        console.error('L Erreur lors de l\'arr�t:', error);
        process.exit(1);
      }
    });
  });
}

// Gestion des erreurs non captur�es
process.on('unhandledRejection', (reason, promise) => {
  console.error('L Promesse non g�r�e:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('L Exception non captur�e:', error);
  process.exit(1);
});

// D�marrage
setupGracefulShutdown();
startServer();
