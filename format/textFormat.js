/**
 * Utilitaires de formatage de texte pour WhatsApp
 * Permet de styliser les messages avec gras, italique, monospace, etc.
 */

/**
 * Formate le texte en gras
 * @param {string} text - Texte à formater
 * @returns {string} Texte formaté en gras
 */
export function bold(text) {
  return `*${text}*`;
}

/**
 * Formate le texte en italique
 * @param {string} text - Texte à formater
 * @returns {string} Texte formaté en italique
 */
export function italic(text) {
  return `_${text}_`;
}

/**
 * Formate le texte en monospace (code)
 * @param {string} text - Texte à formater
 * @returns {string} Texte formaté en monospace
 */
export function monospace(text) {
  return `\`\`\`${text}\`\`\``;
}

/**
 * Formate le texte en barré
 * @param {string} text - Texte à formater
 * @returns {string} Texte formaté en barré
 */
export function strikethrough(text) {
  return `~${text}~`;
}

/**
 * Crée un lien formaté
 * @param {string} label - Libellé du lien
 * @param {string} url - URL du lien
 * @returns {string} Lien formaté
 */
export function link(label, url) {
  return `[${label}](${url})`;
}

/**
 * Formate une liste à puces
 * @param {string[]} items - Tableau d'éléments
 * @returns {string} Liste formatée
 */
export function bulletList(items) {
  return items.map(item => `• ${item}`).join('\n');
}

/**
 * Formate une liste numérotée
 * @param {string[]} items - Tableau d'éléments
 * @returns {string} Liste numérotée
 */
export function numberedList(items) {
  return items.map((item, index) => `${index + 1}. ${item}`).join('\n');
}

/**
 * Combine plusieurs styles
 * @param {string} text - Texte à formater
 * @param {Function[]} formatters - Tableau de fonctions de formatage
 * @returns {string} Texte avec styles combinés
 */
export function combine(text, ...formatters) {
  return formatters.reduce((result, formatter) => formatter(result), text);
}
