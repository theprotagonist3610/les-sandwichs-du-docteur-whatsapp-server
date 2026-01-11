/**
 * Service de gestion des clés API avec hashage et validation
 */

import bcrypt from 'bcrypt';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SALT_ROUNDS = 10;

/**
 * Hash une clé API avec bcrypt
 * @param {string} apiKey - Clé API à hasher
 * @returns {Promise<string>} Hash de la clé
 */
export async function hashApiKey(apiKey) {
  return await bcrypt.hash(apiKey, SALT_ROUNDS);
}

/**
 * Vérifie une clé API contre un hash
 * @param {string} apiKey - Clé API à vérifier
 * @param {string} hashedKey - Hash stocké
 * @returns {Promise<boolean>} True si la clé correspond
 */
export async function verifyApiKey(apiKey, hashedKey) {
  return await bcrypt.compare(apiKey, hashedKey);
}

/**
 * Charge les clés API depuis le fichier JSON
 * @returns {Array} Liste des clés API
 */
export function loadApiKeys() {
  const projectRoot = join(__dirname, '..');
  const keysFile = join(projectRoot, 'api-keys.json');

  if (!existsSync(keysFile)) {
    return [];
  }

  try {
    const content = readFileSync(keysFile, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('❌ [ApiKeyService] Erreur de lecture des clés:', error.message);
    return [];
  }
}

/**
 * Trouve une clé API par sa valeur
 * @param {string} apiKey - Clé API à rechercher
 * @returns {Object|null} Objet clé trouvé ou null
 */
export function findApiKey(apiKey) {
  const keys = loadApiKeys();

  // Recherche la clé en clair (pour compatibilité)
  return keys.find(k => k.key === apiKey && k.active) || null;
}

/**
 * Vérifie si une clé API est valide et retourne ses métadonnées
 * @param {string} apiKey - Clé API à valider
 * @returns {Object|null} Métadonnées de la clé ou null
 */
export function validateApiKey(apiKey) {
  // Fallback sur la variable d'environnement si pas de fichier de clés
  if (process.env.API_KEY && apiKey === process.env.API_KEY) {
    return {
      id: 'env_key',
      name: 'Environment API Key',
      permissions: ['send', 'receive', 'status', 'admin'],
      rateLimit: {
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000
      },
      active: true
    };
  }

  // Recherche dans le fichier de clés
  const keyData = findApiKey(apiKey);

  if (!keyData) {
    return null;
  }

  // Vérifie si la clé a expiré
  if (keyData.expiresAt && new Date(keyData.expiresAt) < new Date()) {
    console.warn(`⚠️  [ApiKeyService] Clé expirée: ${keyData.id}`);
    return null;
  }

  return keyData;
}

/**
 * Vérifie si une clé a une permission spécifique
 * @param {Object} keyData - Métadonnées de la clé
 * @param {string} permission - Permission à vérifier
 * @returns {boolean} True si la permission est accordée
 */
export function hasPermission(keyData, permission) {
  if (!keyData || !keyData.permissions) {
    return false;
  }

  return keyData.permissions.includes(permission) || keyData.permissions.includes('admin');
}

/**
 * Obtient les limites de rate limiting pour une clé
 * @param {Object} keyData - Métadonnées de la clé
 * @returns {Object} Configuration du rate limiting
 */
export function getRateLimitConfig(keyData) {
  if (!keyData || !keyData.rateLimit) {
    // Valeurs par défaut
    return {
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000
    };
  }

  return keyData.rateLimit;
}

/**
 * Met à jour la date de dernière utilisation d'une clé
 * Note: Cette fonction nécessiterait une implémentation avec write pour persister
 * @param {string} keyId - ID de la clé
 */
export function updateLastUsed(keyId) {
  // TODO: Implémenter la mise à jour du fichier JSON
  // Pour l'instant, on log seulement
  console.log(`📝 [ApiKeyService] Clé utilisée: ${keyId}`);
}

/**
 * Vérifie si une IP est autorisée pour une clé
 * @param {Object} keyData - Métadonnées de la clé
 * @param {string} ip - Adresse IP à vérifier
 * @returns {boolean} True si l'IP est autorisée
 */
export function isIpAllowed(keyData, ip) {
  // Si pas de liste d'IPs autorisées, toutes les IPs sont acceptées
  if (!keyData.allowedIps || keyData.allowedIps.length === 0) {
    return true;
  }

  return keyData.allowedIps.includes(ip);
}

/**
 * Génère des statistiques sur les clés API
 * @returns {Object} Statistiques
 */
export function getKeyStatistics() {
  const keys = loadApiKeys();

  return {
    total: keys.length,
    active: keys.filter(k => k.active).length,
    inactive: keys.filter(k => !k.active).length,
    expired: keys.filter(k => k.expiresAt && new Date(k.expiresAt) < new Date()).length
  };
}

export default {
  hashApiKey,
  verifyApiKey,
  loadApiKeys,
  findApiKey,
  validateApiKey,
  hasPermission,
  getRateLimitConfig,
  updateLastUsed,
  isIpAllowed,
  getKeyStatistics
};
