/**
 * Middleware de gestion centralisée des erreurs Express
 */

/**
 * Gestionnaire d'erreurs global
 * @param {Error} err - Erreur
 * @param {Request} req - Requête Express
 * @param {Response} res - Réponse Express
 * @param {Function} next - Fonction next
 */
export function errorHandler(err, req, res, next) {
  // Log l'erreur
  console.error('❌ [Error]', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });

  // Détermine le code de statut
  const statusCode = err.statusCode || err.status || 500;

  // Prépare la réponse d'erreur
  const errorResponse = {
    success: false,
    error: err.message || 'Une erreur interne est survenue',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };

  // Envoie la réponse
  res.status(statusCode).json(errorResponse);
}

/**
 * Gestionnaire pour les routes non trouvées (404)
 * @param {Request} req - Requête Express
 * @param {Response} res - Réponse Express
 */
export function notFoundHandler(req, res) {
  console.warn(`⚠️ [404] Route non trouvée: ${req.method} ${req.path}`);

  res.status(404).json({
    success: false,
    error: 'Route non trouvée',
    message: `La route ${req.method} ${req.path} n'existe pas`,
    availableRoutes: {
      GET: ['/'],
      POST: ['/send', '/webhook']
    }
  });
}

/**
 * Wrapper pour les fonctions async dans les routes Express
 * Capture automatiquement les erreurs et les passe au middleware d'erreur
 * @param {Function} fn - Fonction async
 * @returns {Function} Fonction wrappée
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Crée une erreur HTTP avec un code de statut
 * @param {number} statusCode - Code de statut HTTP
 * @param {string} message - Message d'erreur
 * @returns {Error} Erreur avec statusCode
 */
export function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export default {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  createHttpError
};
