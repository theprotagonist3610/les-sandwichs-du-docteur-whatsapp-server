#!/usr/bin/env node

/**
 * Script de génération de clés API sécurisées
 * Usage: npm run generate-key [nombre_de_clés]
 */

import crypto from 'crypto';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Génère une clé API sécurisée
 * @param {number} length - Longueur de la clé (défaut: 32)
 * @returns {string} Clé API générée
 */
function generateApiKey(length = 32) {
  const bytes = crypto.randomBytes(length);
  return 'sk_' + bytes.toString('hex');
}

/**
 * Génère un ID unique pour la clé
 * @returns {string} ID unique
 */
function generateKeyId() {
  return 'key_' + crypto.randomBytes(8).toString('hex');
}

/**
 * Génère plusieurs clés API avec métadonnées
 * @param {number} count - Nombre de clés à générer
 * @returns {Array} Liste de clés générées
 */
function generateMultipleKeys(count = 1) {
  const keys = [];
  const timestamp = new Date().toISOString();

  for (let i = 0; i < count; i++) {
    const key = generateApiKey();
    const keyId = generateKeyId();

    keys.push({
      id: keyId,
      key: key,
      name: `API Key ${i + 1}`,
      createdAt: timestamp,
      lastUsed: null,
      expiresAt: null,
      active: true,
      permissions: ['send', 'receive', 'status'],
      rateLimit: {
        maxRequests: 100,
        windowMs: 900000 // 15 minutes
      }
    });
  }

  return keys;
}

/**
 * Sauvegarde les clés dans un fichier JSON
 * @param {Array} keys - Liste des clés
 */
function saveKeysToFile(keys) {
  const projectRoot = join(__dirname, '..');
  const keysFile = join(projectRoot, 'api-keys.json');

  let existingKeys = [];

  // Charge les clés existantes si le fichier existe
  if (existsSync(keysFile)) {
    try {
      const content = readFileSync(keysFile, 'utf-8');
      existingKeys = JSON.parse(content);
      console.log(`📂 ${existingKeys.length} clé(s) existante(s) trouvée(s)`);
    } catch (error) {
      console.warn('⚠️  Erreur de lecture du fichier existant, création d\'un nouveau fichier');
    }
  }

  // Ajoute les nouvelles clés
  const allKeys = [...existingKeys, ...keys];

  // Sauvegarde dans le fichier
  writeFileSync(keysFile, JSON.stringify(allKeys, null, 2), 'utf-8');

  console.log(`\n💾 Clés sauvegardées dans: ${keysFile}`);
  console.log(`📊 Total: ${allKeys.length} clé(s)`);
}

/**
 * Met à jour le fichier .env avec la première clé
 * @param {string} apiKey - Clé API à ajouter au .env
 */
function updateEnvFile(apiKey) {
  const projectRoot = join(__dirname, '..');
  const envFile = join(projectRoot, '.env');

  try {
    let envContent = '';

    if (existsSync(envFile)) {
      envContent = readFileSync(envFile, 'utf-8');

      // Met à jour ou ajoute API_KEY
      if (envContent.includes('API_KEY=')) {
        envContent = envContent.replace(/API_KEY=.*/g, `API_KEY=${apiKey}`);
      } else {
        envContent += `\nAPI_KEY=${apiKey}\n`;
      }
    } else {
      envContent = `API_KEY=${apiKey}\n`;
    }

    writeFileSync(envFile, envContent, 'utf-8');
    console.log('✅ Fichier .env mis à jour');
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du .env:', error.message);
  }
}

/**
 * Affiche les clés générées
 * @param {Array} keys - Liste des clés
 */
function displayKeys(keys) {
  console.log('\n🔑 Clés API générées:');
  console.log('━'.repeat(80));

  keys.forEach((keyData, index) => {
    console.log(`\n${index + 1}. ${keyData.name}`);
    console.log(`   ID: ${keyData.id}`);
    console.log(`   Clé: ${keyData.key}`);
    console.log(`   Permissions: ${keyData.permissions.join(', ')}`);
    console.log(`   Rate Limit: ${keyData.rateLimit.maxRequests} req/${keyData.rateLimit.windowMs}ms`);
  });

  console.log('\n━'.repeat(80));
}

/**
 * Affiche l'aide
 */
function displayHelp() {
  console.log(`
🔐 Générateur de Clés API Sécurisées

Usage:
  npm run generate-key [nombre]
  node scripts/generateApiKey.js [nombre]

Exemples:
  npm run generate-key          # Génère 1 clé
  npm run generate-key 5        # Génère 5 clés

Options:
  nombre    Nombre de clés à générer (défaut: 1)
  --help    Affiche cette aide

Les clés sont sauvegardées dans:
  - api-keys.json (toutes les clés avec métadonnées)
  - .env (première clé générée)

⚠️  IMPORTANT:
  - Gardez vos clés en sécurité
  - Ne commitez JAMAIS api-keys.json ou .env dans Git
  - Ajoutez api-keys.json au .gitignore
  `);
}

// ========== MAIN ==========

function main() {
  const args = process.argv.slice(2);

  // Affiche l'aide
  if (args.includes('--help') || args.includes('-h')) {
    displayHelp();
    process.exit(0);
  }

  // Nombre de clés à générer
  const count = parseInt(args[0]) || 1;

  if (count < 1 || count > 100) {
    console.error('❌ Le nombre de clés doit être entre 1 et 100');
    process.exit(1);
  }

  console.log('🔐 Génération de clés API sécurisées...\n');

  // Génère les clés
  const keys = generateMultipleKeys(count);

  // Affiche les clés
  displayKeys(keys);

  // Sauvegarde dans le fichier JSON
  saveKeysToFile(keys);

  // Met à jour le .env avec la première clé
  if (keys.length > 0) {
    updateEnvFile(keys[0].key);
  }

  console.log('\n✨ Terminé!\n');
  console.log('📝 Prochaines étapes:');
  console.log('   1. Vérifiez api-keys.json pour voir toutes les clés');
  console.log('   2. Ajoutez "api-keys.json" à votre .gitignore');
  console.log('   3. Configurez les clés sur votre serveur de production');
  console.log('   4. Testez l\'API avec: curl -H "x-api-key: YOUR_KEY" http://localhost:3000/\n');
}

main();
