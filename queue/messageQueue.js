/**
 * File d'attente FIFO pour gérer les envois de messages WhatsApp
 * Évite les collisions lors d'envois simultanés
 */

class MessageQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  /**
   * Ajoute une tâche à la file d'attente
   * @param {Function} task - Fonction asynchrone à exécuter
   * @returns {Promise} Promesse résolue quand la tâche est terminée
   */
  async enqueue(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        task,
        resolve,
        reject
      });

      // Démarre le traitement si ce n'est pas déjà en cours
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Traite la file d'attente de manière séquentielle
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const { task, resolve, reject } = this.queue.shift();

      try {
        console.log(`📤 [Queue] Traitement d'une tâche (${this.queue.length} restantes)`);
        const result = await task();
        resolve(result);
      } catch (error) {
        console.error('❌ [Queue] Erreur lors du traitement:', error.message);
        reject(error);
      }

      // Petite pause entre chaque envoi pour éviter de surcharger WhatsApp
      if (this.queue.length > 0) {
        await this.delay(1000);
      }
    }

    this.processing = false;
    console.log('✅ [Queue] File d\'attente vide');
  }

  /**
   * Retourne le nombre de tâches en attente
   * @returns {number} Nombre de tâches
   */
  size() {
    return this.queue.length;
  }

  /**
   * Vérifie si la file est en cours de traitement
   * @returns {boolean} True si en traitement
   */
  isProcessing() {
    return this.processing;
  }

  /**
   * Vide complètement la file d'attente
   */
  clear() {
    this.queue = [];
    console.log('🗑️ [Queue] File d\'attente vidée');
  }

  /**
   * Délai d'attente
   * @param {number} ms - Millisecondes
   * @returns {Promise} Promesse résolue après le délai
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retourne des statistiques sur la file
   * @returns {Object} Statistiques
   */
  getStats() {
    return {
      queueSize: this.queue.length,
      isProcessing: this.processing
    };
  }
}

// Instance singleton
const messageQueue = new MessageQueue();

export default messageQueue;
