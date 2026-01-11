/**
 * Initialisation et configuration du client WhatsApp Web
 */

import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';

let client = null;
let isReady = false;
let latestQrCode = null; // Stocke le dernier QR code généré

/**
 * Crée et configure le client WhatsApp
 * @returns {Client} Instance du client
 */
export function createWhatsAppClient() {
  if (client) {
    return client;
  }

  console.log('🔧 [WhatsApp] Initialisation du client...');

  // Configuration Puppeteer avec détection automatique de Chromium
  const puppeteerConfig = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  };

  // Détection automatique du chemin Chromium pour différents environnements
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    // Railway/Render: utiliser le chemin fourni
    puppeteerConfig.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    console.log(`📍 [WhatsApp] Utilisation de Chromium: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
  } else if (process.env.NODE_ENV === 'production') {
    // Production sans chemin explicite: essayer les chemins communs
    const possiblePaths = [
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/google-chrome',
      '/nix/store/chromium'
    ];

    for (const path of possiblePaths) {
      try {
        if (require('fs').existsSync(path)) {
          puppeteerConfig.executablePath = path;
          console.log(`📍 [WhatsApp] Chromium trouvé: ${path}`);
          break;
        }
      } catch (e) {
        // Continuer la recherche
      }
    }
  }

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: './session'
    }),
    puppeteer: puppeteerConfig
  });

  setupEventHandlers(client);

  return client;
}

/**
 * Configure les gestionnaires d'événements du client
 * @param {Client} client - Instance du client WhatsApp
 */
function setupEventHandlers(client) {
  // Événement: QR Code généré
  client.on('qr', async (qr) => {
    // Stocker le QR code pour l'API
    latestQrCode = qr;

    console.log('📱 [WhatsApp] QR Code généré. Scannez-le avec votre téléphone:');
    console.log('');
    qrcode.generate(qr, { small: true });
    console.log('');
    console.log('💡 Ouvrez WhatsApp > Appareils connectés > Connecter un appareil');
    console.log('🌐 Ou accédez à: http://localhost:3000/api/qr pour le QR code image');
  });

  // Événement: Client prêt
  client.on('ready', () => {
    isReady = true;
    latestQrCode = null; // Effacer le QR code une fois connecté
    console.log('✅ [WhatsApp] Client connecté et prêt !');
    console.log(`📞 [WhatsApp] Numéro: ${client.info?.wid?.user || 'Non disponible'}`);
  });

  // Événement: Authentification réussie
  client.on('authenticated', () => {
    console.log('🔐 [WhatsApp] Authentification réussie');
  });

  // Événement: Échec d'authentification
  client.on('auth_failure', (message) => {
    console.error('❌ [WhatsApp] Échec d\'authentification:', message);
    isReady = false;
  });

  // Événement: Client déconnecté
  client.on('disconnected', (reason) => {
    console.warn('⚠️ [WhatsApp] Client déconnecté:', reason);
    isReady = false;
    latestQrCode = null;

    // Tentative de reconnexion automatique après 5 secondes
    console.log('🔄 [WhatsApp] Tentative de reconnexion dans 5 secondes...');
    setTimeout(async () => {
      try {
        console.log('🔄 [WhatsApp] Reconnexion en cours...');
        await client.initialize();
      } catch (error) {
        console.error('❌ [WhatsApp] Échec de la reconnexion:', error.message);
      }
    }, 5000);
  });

  // Événement: Chargement de l'écran
  client.on('loading_screen', (percent, message) => {
    console.log(`⏳ [WhatsApp] Chargement: ${percent}% - ${message}`);
  });

  // Événement: Erreur
  client.on('error', (error) => {
    // Filtrer les erreurs connues
    if (error.message &&
        (error.message.includes('Session closed') ||
         error.message.includes('Protocol error') ||
         error.message.includes('page has been closed'))) {
      console.error('❌ [WhatsApp] Session Puppeteer fermée:', error.message.substring(0, 100));
      isReady = false;
    } else {
      console.error('❌ [WhatsApp] Erreur:', error);
    }
  });
}

/**
 * Démarre le client WhatsApp
 * @returns {Promise<Client>} Client initialisé
 */
export async function initializeWhatsApp() {
  if (!client) {
    client = createWhatsAppClient();
  }

  try {
    console.log('🚀 [WhatsApp] Démarrage du client...');
    await client.initialize();
    return client;
  } catch (error) {
    console.error('❌ [WhatsApp] Erreur lors de l\'initialisation:', error);
    throw error;
  }
}

/**
 * Obtient l'instance du client WhatsApp
 * @returns {Client|null} Instance du client ou null
 */
export function getClient() {
  return client;
}

/**
 * Vérifie si le client est prêt
 * @returns {boolean} True si prêt
 */
export function isClientReady() {
  return isReady && client !== null;
}

/**
 * Obtient le dernier QR code généré
 * @returns {string|null} QR code string ou null
 */
export function getLatestQrCode() {
  return latestQrCode;
}

/**
 * Déconnecte le client WhatsApp
 * @returns {Promise<void>}
 */
export async function disconnectClient() {
  if (client) {
    console.log('👋 [WhatsApp] Déconnexion du client...');
    await client.destroy();
    client = null;
    isReady = false;
  }
}

/**
 * Obtient les informations du client
 * @returns {Object|null} Informations ou null
 */
export function getClientInfo() {
  if (!isClientReady()) {
    return null;
  }

  return {
    ready: isReady,
    number: client.info?.wid?.user || null,
    platform: client.info?.platform || null,
    pushname: client.info?.pushname || null
  };
}

export default {
  createWhatsAppClient,
  initializeWhatsApp,
  getClient,
  isClientReady,
  disconnectClient,
  getClientInfo
};
