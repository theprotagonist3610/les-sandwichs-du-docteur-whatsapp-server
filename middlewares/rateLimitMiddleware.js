/**
 * Middleware de rate limiting avec configuration par clé API
 */

import rateLimit from 'express-rate-limit';
import { validateApiKey, getRateLimitConfig } from '../services/apiKeyService.js';

/**
 * Store personnalisé pour le rate limiting basé sur la clé API
 */
class ApiKeyStore {
  constructor() {
    this.hits = new Map();
    this.resetTimes = new Map();
  }

  async increment(key) {
    const now = Date.now();
    const resetTime = this.resetTimes.get(key);

    // Réinitialise si la fenêtre est expirée
    if (resetTime && now > resetTime) {
      this.hits.delete(key);
      this.resetTimes.delete(key);
    }

    const current = this.hits.get(key) || 0;
    const newCount = current + 1;
    this.hits.set(key, newCount);

    // Définit le temps de réinitialisation si c'est le premier hit
    if (!resetTime) {
      const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000;
      this.resetTimes.set(key, now + windowMs);
    }

    return {
      totalHits: newCount,
      resetTime: this.resetTimes.get(key)
    };
  }

  async decrement(key) {
    const current = this.hits.get(key) || 0;
    if (current > 0) {
      this.hits.set(key, current - 1);
    }
  }

  async resetKey(key) {
    this.hits.delete(key);
    this.resetTimes.delete(key);
  }
}

const store = new ApiKeyStore();

/**
 * Crée un limiteur de débit basique
 * @returns {Function} Middleware de rate limiting
 */
export function createBasicRateLimiter() {
  return rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
      success: false,
      error: 'Trop de requêtes',
      message: 'Veuillez réessayer plus tard'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Identifie par IP
    keyGenerator: (req) => {
      return req.ip || req.headers['x-forwarded-for'] || 'unknown';
    }
  });
}

/**
 * Crée un limiteur de débit par clé API
 * Utilise les limites définies dans les métadonnées de la clé
 * @returns {Function} Middleware de rate limiting
 */
export function createApiKeyRateLimiter() {
  return rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    max: async (req) => {
      const apiKey = req.headers['x-api-key'];

      if (!apiKey) {
        return parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;
      }

      const keyData = validateApiKey(apiKey);
      if (!keyData) {
        return parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;
      }

      const rateLimitConfig = getRateLimitConfig(keyData);
      return rateLimitConfig.maxRequests;
    },
    message: {
      success: false,
      error: 'Limite de débit atteinte',
      message: 'Vous avez dépassé le nombre de requêtes autorisées'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Identifie par clé API
    keyGenerator: (req) => {
      const apiKey = req.headers['x-api-key'];
      return apiKey || req.ip || 'anonymous';
    },
    // Handler personnalisé quand la limite est atteinte
    handler: (req, res) => {
      console.warn(`⚠️  [RateLimit] Limite atteinte pour: ${req.headers['x-api-key']?.substring(0, 15) || req.ip}`);

      res.status(429).json({
        success: false,
        error: 'Limite de débit atteinte',
        message: 'Vous avez dépassé le nombre de requêtes autorisées. Veuillez réessayer plus tard.',
        retryAfter: res.getHeader('Retry-After')
      });
    },
    // Skip si authentification échoue (sera géré par authMiddleware)
    skip: (req) => {
      // Ne rate limite pas les routes publiques
      return req.path === '/' || req.path === '/health';
    }
  });
}

/**
 * Middleware de rate limiting strict pour les endpoints sensibles
 * @returns {Function} Middleware de rate limiting strict
 */
export function createStrictRateLimiter() {
  return rateLimit({
    windowMs: 60000, // 1 minute
    max: 10, // 10 requêtes par minute
    message: {
      success: false,
      error: 'Trop de requêtes',
      message: 'Cette action est limitée. Veuillez réessayer dans quelques instants.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const apiKey = req.headers['x-api-key'];
      return apiKey || req.ip || 'anonymous';
    }
  });
}

/**
 * Middleware de rate limiting pour l'envoi en masse
 * @returns {Function} Middleware de rate limiting pour bulk
 */
export function createBulkSendRateLimiter() {
  return rateLimit({
    windowMs: 3600000, // 1 heure
    max: 5, // 5 envois en masse par heure
    message: {
      success: false,
      error: 'Limite d\'envoi en masse atteinte',
      message: 'Vous avez atteint la limite d\'envois en masse. Veuillez réessayer dans une heure.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const apiKey = req.headers['x-api-key'];
      return `bulk_${apiKey || req.ip}`;
    },
    skip: (req) => {
      // Ne rate limite que les vraies requêtes bulk (plus de 10 destinataires)
      const numbers = req.body?.numbers;
      return !Array.isArray(numbers) || numbers.length <= 10;
    }
  });
}

/**
 * Middleware pour logger les statistiques de rate limiting
 */
export function rateLimitLogger(req, res, next) {
  const remaining = res.getHeader('X-RateLimit-Remaining');
  const limit = res.getHeader('X-RateLimit-Limit');

  if (remaining !== undefined && limit !== undefined) {
    const apiKey = req.headers['x-api-key'];
    const keyPreview = apiKey ? apiKey.substring(0, 15) + '...' : req.ip;

    console.log(`📊 [RateLimit] ${keyPreview}: ${remaining}/${limit} requêtes restantes`);

    // Alerte si proche de la limite
    if (parseInt(remaining) < parseInt(limit) * 0.1) {
      console.warn(`⚠️  [RateLimit] ${keyPreview} proche de la limite (${remaining}/${limit})`);
    }
  }

  next();
}

export default {
  createBasicRateLimiter,
  createApiKeyRateLimiter,
  createStrictRateLimiter,
  createBulkSendRateLimiter,
  rateLimitLogger
};
