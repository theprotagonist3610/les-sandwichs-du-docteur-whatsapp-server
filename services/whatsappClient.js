/**
 * Initialisation et configuration du client WhatsApp Web
 */

import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

let client = null;
let isReady = false;

/**
 * Crée et configure le client WhatsApp
 * @returns {Client} Instance du client
 */
export function createWhatsAppClient() {
  if (client) {
    return client;
  }

  console.log('🔧 [WhatsApp] Initialisation du client...');

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: './session'
    }),
    puppeteer: {
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
    }
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
  client.on('qr', (qr) => {
    console.log('📱 [WhatsApp] QR Code généré. Scannez-le avec votre téléphone:');
    console.log('');
    qrcode.generate(qr, { small: true });
    console.log('');
    console.log('💡 Ouvrez WhatsApp > Appareils connectés > Connecter un appareil');
  });

  // Événement: Client prêt
  client.on('ready', () => {
    isReady = true;
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
  });

  // Événement: Chargement de l'écran
  client.on('loading_screen', (percent, message) => {
    console.log(`⏳ [WhatsApp] Chargement: ${percent}% - ${message}`);
  });

  // Événement: Erreur
  client.on('error', (error) => {
    console.error('❌ [WhatsApp] Erreur:', error);
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
