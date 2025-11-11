/**
 * Serveur WhatsApp avec API REST
 * Hébergé sur Render - Compatible Free Tier
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

// Services WhatsApp
import { initializeWhatsApp, getClient } from './services/whatsappClient.js';
import { handleIncomingMessage } from './services/messageService.js';

// Middlewares
import { authMiddleware, logAccess } from './middlewares/authMiddleware.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import {
  healthCheck,
  sendMessageHandler,
  sendBulkHandler,
  webhookHandler,
  queueStatsHandler,
  clientInfoHandler
} from './middlewares/apiHandler.js';

// Configuration
const PORT = process.env.PORT || 3000;
const app = express();

// Middlewares globaux
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger HTTP (désactivé en production pour économiser les ressources)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use(logAccess);

// Routes publiques
app.get('/', healthCheck);

// Routes protégées par authentification
app.post('/send', authMiddleware, sendMessageHandler);
app.post('/send/bulk', authMiddleware, sendBulkHandler);
app.post('/webhook', authMiddleware, webhookHandler);
app.get('/queue/stats', authMiddleware, queueStatsHandler);
app.get('/client/info', authMiddleware, clientInfoHandler);

// Gestionnaire 404
app.use(notFoundHandler);

// Gestionnaire d'erreurs global
app.use(errorHandler);

/**
 * Initialise le serveur et le client WhatsApp
 */
async function startServer() {
  console.log('=€ Démarrage du serveur WhatsApp...');
  console.log('');

  // Vérification de la configuration
  if (!process.env.API_KEY) {
    console.error('L ERREUR: API_KEY non définie dans .env');
    console.error('=¡ Créez un fichier .env avec : API_KEY=votre_cle_secrete');
    process.exit(1);
  }

  try {
    // Démarre le serveur Express
    app.listen(PORT, () => {
      console.log(' Serveur Express démarré');
      console.log(`=á Port: ${PORT}`);
      console.log(`< URL: http://localhost:${PORT}`);
      console.log('');
    });

    // Initialise le client WhatsApp
    console.log('=ñ Initialisation du client WhatsApp...');
    await initializeWhatsApp();

    // Configure les gestionnaires de messages
    const client = getClient();
    if (client) {
      client.on('message', handleIncomingMessage);
      console.log(' Gestionnaires de messages configurés');
      console.log('');
      console.log('PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP');
      console.log(' SERVEUR PRÊT');
      console.log('PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP');
      console.log('');
      console.log('=Ý Testez l\'API avec:');
      console.log('   curl -X POST http://localhost:' + PORT + '/send \\');
      console.log('   -H "Content-Type: application/json" \\');
      console.log('   -H "x-api-key: ' + process.env.API_KEY + '" \\');
      console.log('   -d \'{"number":"229XXXXXXXX","message":"Test"}\'');
      console.log('');
    }
  } catch (error) {
    console.error('L Erreur lors du démarrage:', error);
    process.exit(1);
  }
}

/**
 * Gestion de l'arrêt propre du serveur
 */
function setupGracefulShutdown() {
  const signals = ['SIGTERM', 'SIGINT'];

  signals.forEach(signal => {
    process.on(signal, async () => {
      console.log('');
      console.log(`\n=Ñ Signal ${signal} reçu, arrêt du serveur...`);

      try {
        const client = getClient();
        if (client) {
          await client.destroy();
          console.log(' Client WhatsApp déconnecté');
        }

        console.log('=K Serveur arrêté proprement');
        process.exit(0);
      } catch (error) {
        console.error('L Erreur lors de l\'arrêt:', error);
        process.exit(1);
      }
    });
  });
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  console.error('L Promesse non gérée:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('L Exception non capturée:', error);
  process.exit(1);
});

// Démarrage
setupGracefulShutdown();
startServer();
