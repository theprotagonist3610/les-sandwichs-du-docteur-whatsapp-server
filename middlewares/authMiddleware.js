/**
 * Middleware d'authentification par clé API
 * Protège les endpoints sensibles
 */

/**
 * Vérifie la présence et la validité de la clé API
 * @param {Request} req - Requête Express
 * @param {Response} res - Réponse Express
 * @param {Function} next - Fonction next
 */
export function authMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const expectedApiKey = process.env.API_KEY;

  // Vérifie si la clé API est configurée
  if (!expectedApiKey) {
    console.error('⚠️ [Auth] API_KEY non configurée dans .env');
    return res.status(500).json({
      success: false,
      error: 'Configuration serveur invalide'
    });
  }

  // Vérifie si la clé est fournie
  if (!apiKey) {
    console.warn('🔒 [Auth] Tentative d\'accès sans clé API');
    return res.status(401).json({
      success: false,
      error: 'Clé API manquante',
      message: 'Veuillez fournir un header "x-api-key"'
    });
  }

  // Vérifie la validité de la clé
  if (apiKey !== expectedApiKey) {
    console.warn('🔒 [Auth] Tentative d\'accès avec clé API invalide');
    return res.status(403).json({
      success: false,
      error: 'Clé API invalide',
      message: 'La clé API fournie n\'est pas valide'
    });
  }

  // Authentification réussie
  console.log('✅ [Auth] Accès autorisé');
  next();
}

/**
 * Middleware optionnel pour logger les tentatives d'accès
 * @param {Request} req - Requête Express
 * @param {Response} res - Réponse Express
 * @param {Function} next - Fonction next
 */
export function logAccess(req, res, next) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const timestamp = new Date().toISOString();

  console.log(`📝 [Access] ${timestamp} - ${req.method} ${req.path} - IP: ${ip}`);

  next();
}

export default {
  authMiddleware,
  logAccess
};
