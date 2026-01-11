#!/usr/bin/env node

/**
 * Script de rotation des clés API
 * Usage: npm run rotate-key <key-id>
 */

import crypto from 'crypto';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Génère une nouvelle clé API
 * @returns {string} Nouvelle clé
 */
function generateNewKey() {
  const bytes = crypto.randomBytes(32);
  return 'sk_' + bytes.toString('hex');
}

/**
 * Charge les clés depuis le fichier
 * @returns {Array} Liste des clés
 */
function loadKeys() {
  const projectRoot = join(__dirname, '..');
  const keysFile = join(projectRoot, 'api-keys.json');

  if (!existsSync(keysFile)) {
    console.error('❌ Fichier api-keys.json introuvable');
    console.error('💡 Générez d\'abord des clés avec: npm run generate-key');
    process.exit(1);
  }

  try {
    const content = readFileSync(keysFile, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('❌ Erreur de lecture du fichier:', error.message);
    process.exit(1);
  }
}

/**
 * Sauvegarde les clés dans le fichier
 * @param {Array} keys - Liste des clés
 */
function saveKeys(keys) {
  const projectRoot = join(__dirname, '..');
  const keysFile = join(projectRoot, 'api-keys.json');

  try {
    writeFileSync(keysFile, JSON.stringify(keys, null, 2), 'utf-8');
    console.log('✅ Clés mises à jour avec succès');
  } catch (error) {
    console.error('❌ Erreur d\'écriture:', error.message);
    process.exit(1);
  }
}

/**
 * Effectue la rotation d'une clé
 * @param {string} keyId - ID de la clé à faire pivoter
 */
function rotateKey(keyId) {
  const keys = loadKeys();

  // Trouve la clé
  const keyIndex = keys.findIndex(k => k.id === keyId);

  if (keyIndex === -1) {
    console.error(`❌ Clé introuvable: ${keyId}`);
    console.log('\n📋 Clés disponibles:');
    keys.forEach(k => {
      console.log(`   - ${k.id}: ${k.name} (${k.active ? 'active' : 'inactive'})`);
    });
    process.exit(1);
  }

  const oldKey = keys[keyIndex].key;
  const newKey = generateNewKey();
  const timestamp = new Date().toISOString();

  // Archive l'ancienne clé
  const archivedKey = {
    ...keys[keyIndex],
    key: oldKey,
    active: false,
    rotatedAt: timestamp,
    rotatedTo: keyId + '_new'
  };

  // Crée la nouvelle clé
  keys[keyIndex] = {
    ...keys[keyIndex],
    key: newKey,
    rotatedAt: timestamp,
    rotatedFrom: oldKey.substring(0, 15) + '...'
  };

  // Sauvegarde
  saveKeys(keys);

  // Affichage
  console.log('\n🔄 Rotation de clé effectuée\n');
  console.log('━'.repeat(80));
  console.log(`\nID: ${keyId}`);
  console.log(`Nom: ${keys[keyIndex].name}`);
  console.log(`\nAncienne clé: ${oldKey.substring(0, 20)}...`);
  console.log(`Nouvelle clé: ${newKey}`);
  console.log(`\nDate: ${timestamp}`);
  console.log('\n━'.repeat(80));
  console.log('\n⚠️  IMPORTANT:');
  console.log('   1. Mettez à jour tous les clients utilisant cette clé');
  console.log('   2. L\'ancienne clé est maintenant invalide');
  console.log('   3. Testez la nouvelle clé avant de déployer\n');
}

/**
 * Désactive une clé
 * @param {string} keyId - ID de la clé à désactiver
 */
function deactivateKey(keyId) {
  const keys = loadKeys();
  const keyIndex = keys.findIndex(k => k.id === keyId);

  if (keyIndex === -1) {
    console.error(`❌ Clé introuvable: ${keyId}`);
    process.exit(1);
  }

  keys[keyIndex].active = false;
  keys[keyIndex].deactivatedAt = new Date().toISOString();

  saveKeys(keys);
  console.log(`✅ Clé ${keyId} désactivée`);
}

/**
 * Réactive une clé
 * @param {string} keyId - ID de la clé à réactiver
 */
function activateKey(keyId) {
  const keys = loadKeys();
  const keyIndex = keys.findIndex(k => k.id === keyId);

  if (keyIndex === -1) {
    console.error(`❌ Clé introuvable: ${keyId}`);
    process.exit(1);
  }

  keys[keyIndex].active = true;
  keys[keyIndex].reactivatedAt = new Date().toISOString();

  saveKeys(keys);
  console.log(`✅ Clé ${keyId} réactivée`);
}

/**
 * Liste toutes les clés
 */
function listKeys() {
  const keys = loadKeys();

  console.log('\n📋 Liste des clés API\n');
  console.log('━'.repeat(80));

  keys.forEach(key => {
    const status = key.active ? '✅ Active' : '❌ Inactive';
    const expired = key.expiresAt && new Date(key.expiresAt) < new Date() ? '⏰ Expirée' : '';

    console.log(`\n${key.name}`);
    console.log(`   ID: ${key.id}`);
    console.log(`   Clé: ${key.key.substring(0, 20)}...`);
    console.log(`   Statut: ${status} ${expired}`);
    console.log(`   Créée: ${key.createdAt}`);
    if (key.lastUsed) console.log(`   Dernière utilisation: ${key.lastUsed}`);
    if (key.rotatedAt) console.log(`   Dernière rotation: ${key.rotatedAt}`);
  });

  console.log('\n━'.repeat(80));
  console.log(`\nTotal: ${keys.length} clé(s)\n`);
}

/**
 * Affiche l'aide
 */
function showHelp() {
  console.log(`
🔄 Gestion et Rotation des Clés API

Usage:
  npm run rotate-key <command> [arguments]

Commandes:
  rotate <key-id>      Fait pivoter une clé (génère une nouvelle clé)
  deactivate <key-id>  Désactive une clé
  activate <key-id>    Réactive une clé
  list                 Liste toutes les clés
  help                 Affiche cette aide

Exemples:
  npm run rotate-key rotate key_abc123
  npm run rotate-key deactivate key_abc123
  npm run rotate-key list

Note:
  La rotation génère une nouvelle clé et désactive l'ancienne.
  Assurez-vous de mettre à jour tous les clients après une rotation.
  `);
}

// ========== MAIN ==========

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'help' || args[0] === '--help') {
    showHelp();
    process.exit(0);
  }

  const command = args[0];
  const keyId = args[1];

  switch (command) {
    case 'rotate':
      if (!keyId) {
        console.error('❌ Veuillez spécifier l\'ID de la clé');
        console.log('Usage: npm run rotate-key rotate <key-id>');
        process.exit(1);
      }
      rotateKey(keyId);
      break;

    case 'deactivate':
      if (!keyId) {
        console.error('❌ Veuillez spécifier l\'ID de la clé');
        process.exit(1);
      }
      deactivateKey(keyId);
      break;

    case 'activate':
      if (!keyId) {
        console.error('❌ Veuillez spécifier l\'ID de la clé');
        process.exit(1);
      }
      activateKey(keyId);
      break;

    case 'list':
      listKeys();
      break;

    default:
      console.error(`❌ Commande inconnue: ${command}`);
      console.log('Utilisez "npm run rotate-key help" pour voir l\'aide');
      process.exit(1);
  }
}

main();
