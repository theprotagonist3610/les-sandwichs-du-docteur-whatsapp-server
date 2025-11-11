/**
 * Worker pour gérer l'exécution des tâches de la file d'attente
 * Gestion des priorités, retries et logs
 */

import messageQueue from './messageQueue.js';

/**
 * Configuration du worker
 */
const WORKER_CONFIG = {
  maxRetries: 3,
  retryDelay: 2000, // 2 secondes
  taskTimeout: 30000 // 30 secondes
};

/**
 * Exécute une tâche avec gestion des retries
 * @param {Function} task - Tâche asynchrone à exécuter
 * @param {Object} options - Options d'exécution
 * @returns {Promise} Résultat de la tâche
 */
export async function executeWithRetry(task, options = {}) {
  const {
    maxRetries = WORKER_CONFIG.maxRetries,
    retryDelay = WORKER_CONFIG.retryDelay,
    taskName = 'Tâche inconnue'
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 [Worker] ${taskName} - Tentative ${attempt}/${maxRetries}`);

      const result = await executeWithTimeout(task, WORKER_CONFIG.taskTimeout);

      if (attempt > 1) {
        console.log(`✅ [Worker] ${taskName} - Succès après ${attempt} tentative(s)`);
      }

      return result;
    } catch (error) {
      lastError = error;
      console.error(`❌ [Worker] ${taskName} - Échec tentative ${attempt}:`, error.message);

      if (attempt < maxRetries) {
        console.log(`⏳ [Worker] Nouvelle tentative dans ${retryDelay}ms...`);
        await delay(retryDelay);
      }
    }
  }

  throw new Error(`Échec après ${maxRetries} tentatives: ${lastError.message}`);
}

/**
 * Exécute une tâche avec timeout
 * @param {Function} task - Tâche à exécuter
 * @param {number} timeout - Délai maximum en ms
 * @returns {Promise} Résultat de la tâche
 */
function executeWithTimeout(task, timeout) {
  return Promise.race([
    task(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout dépassé')), timeout)
    )
  ]);
}

/**
 * Enqueue une tâche avec retry automatique
 * @param {Function} task - Tâche à exécuter
 * @param {Object} options - Options
 * @returns {Promise} Résultat
 */
export async function enqueueWithRetry(task, options = {}) {
  return messageQueue.enqueue(async () => {
    return await executeWithRetry(task, options);
  });
}

/**
 * Enqueue une tâche avec priorité
 * @param {Function} task - Tâche à exécuter
 * @param {number} priority - Niveau de priorité (plus élevé = plus prioritaire)
 * @param {Object} options - Options
 * @returns {Promise} Résultat
 */
export async function enqueueWithPriority(task, priority = 0, options = {}) {
  // Note: Dans cette version simple, on utilise juste la file FIFO
  // Pour une vraie gestion de priorités, il faudrait modifier MessageQueue
  console.log(`📌 [Worker] Tâche ajoutée avec priorité ${priority}`);
  return enqueueWithRetry(task, options);
}

/**
 * Délai d'attente
 * @param {number} ms - Millisecondes
 * @returns {Promise}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Obtient les statistiques du worker
 * @returns {Object} Statistiques
 */
export function getWorkerStats() {
  return {
    ...messageQueue.getStats(),
    config: WORKER_CONFIG
  };
}

/**
 * Log les statistiques de la file
 */
export function logQueueStats() {
  const stats = getWorkerStats();
  console.log('📊 [Worker] Statistiques:', {
    'Tâches en attente': stats.queueSize,
    'En traitement': stats.isProcessing ? 'Oui' : 'Non',
    'Max retries': stats.config.maxRetries
  });
}

export default {
  executeWithRetry,
  enqueueWithRetry,
  enqueueWithPriority,
  getWorkerStats,
  logQueueStats
};
