/**
 * Modèles de messages préformatés pour les réponses automatiques
 */

import { bold, italic, monospace, bulletList } from './textFormat.js';

/**
 * Message de bienvenue
 * @param {string} name - Nom de l'utilisateur
 * @returns {string} Message formaté
 */
export function welcomeMessage(name = 'utilisateur') {
  return `${bold('Bienvenue')} ${name} ! 👋

Je suis un bot WhatsApp automatisé.

${bold('Commandes disponibles :')}
${bulletList([
    '`ping` - Vérifie que le bot répond',
    '`aide` - Affiche ce message',
    '`info` - Informations sur le bot'
  ])}`;
}

/**
 * Réponse au ping
 * @returns {string} Message formaté
 */
export function pongMessage() {
  return 'pong ✅';
}

/**
 * Message d'aide
 * @returns {string} Message formaté
 */
export function helpMessage() {
  return `${bold('🤖 Bot WhatsApp')}

${bold('Commandes disponibles :')}
• ${monospace('ping')} - Test de connexion
• ${monospace('aide')} - Affiche ce message
• ${monospace('info')} - Informations sur le bot

${italic('Bot développé avec whatsapp-web.js')}`;
}

/**
 * Message d'information
 * @returns {string} Message formaté
 */
export function infoMessage() {
  return `${bold('ℹ️ Informations')}

${bold('Version :')} 1.0.0
${bold('Stack :')} Node.js + Express + whatsapp-web.js
${bold('Statut :')} ✅ Opérationnel

${italic('Serveur hébergé sur Render')}`;
}

/**
 * Message d'erreur générique
 * @param {string} error - Description de l'erreur
 * @returns {string} Message formaté
 */
export function errorMessage(error) {
  return `❌ ${bold('Erreur')}

${error}

${italic('Veuillez réessayer ultérieurement.')}`;
}

/**
 * Message de confirmation d'envoi
 * @returns {string} Message formaté
 */
export function sendConfirmation() {
  return '✅ Message envoyé avec succès !';
}

/**
 * Message de commande inconnue
 * @returns {string} Message formaté
 */
export function unknownCommandMessage() {
  return `❓ Commande non reconnue.

Tapez ${monospace('aide')} pour voir les commandes disponibles.`;
}
