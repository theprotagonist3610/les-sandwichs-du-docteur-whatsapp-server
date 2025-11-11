# 🔧 Guide Avancé

Documentation pour les fonctionnalités avancées et la personnalisation.

## 📋 Table des matières

- [Architecture](#architecture)
- [Formatage personnalisé](#formatage-personnalisé)
- [File d'attente](#file-dattente)
- [Gestion des messages](#gestion-des-messages)
- [Webhooks](#webhooks)
- [Sécurité](#sécurité)

---

## 🏗️ Architecture

### Flux de traitement d'un message

```
Client HTTP
    ↓
Express Router (apiHandler.js)
    ↓
Auth Middleware (authMiddleware.js)
    ↓
Message Service (messageService.js)
    ↓
Queue Worker (queueWorker.js)
    ↓
Message Queue (messageQueue.js)
    ↓
WhatsApp Client (whatsappClient.js)
    ↓
WhatsApp Web API
```

### Modules et responsabilités

| Module | Responsabilité |
|--------|----------------|
| `server.js` | Point d'entrée, initialisation |
| `services/whatsappClient.js` | Client WhatsApp Web |
| `services/messageService.js` | Logique d'envoi/réception |
| `queue/messageQueue.js` | File FIFO pour éviter collisions |
| `queue/queueWorker.js` | Retries et timeout |
| `middlewares/apiHandler.js` | Routes Express |
| `middlewares/authMiddleware.js` | Protection par clé API |
| `middlewares/errorHandler.js` | Gestion des erreurs |
| `format/textFormat.js` | Utilitaires de formatage |
| `format/messageTemplates.js` | Templates de messages |

---

## 🎨 Formatage personnalisé

### Créer un template personnalisé

Ajoutez dans `format/messageTemplates.js` :

```javascript
import { bold, italic, bulletList } from './textFormat.js';

export function customNotification(title, items) {
  return `${bold(`🔔 ${title}`)}

${bulletList(items)}

${italic('Notification automatique')}`;
}
```

### Utiliser dans votre code

```javascript
import { customNotification } from './format/messageTemplates.js';
import { sendMessage } from './services/messageService.js';

const message = customNotification('Nouvelle commande', [
  'Article : Sandwich poulet',
  'Quantité : 2',
  'Prix : 5000 FCFA'
]);

await sendMessage('229XXXXXXXX', message);
```

### Styles WhatsApp disponibles

| Syntaxe | Rendu |
|---------|-------|
| `*texte*` | **gras** |
| `_texte_` | *italique* |
| `` ```texte``` `` | `monospace` |
| `~texte~` | ~~barré~~ |

---

## ⚙️ File d'attente

### Configuration

Dans `queue/queueWorker.js` :

```javascript
const WORKER_CONFIG = {
  maxRetries: 3,      // Nombre de tentatives
  retryDelay: 2000,   // Délai entre tentatives (ms)
  taskTimeout: 30000  // Timeout par tâche (ms)
};
```

### Personnaliser

```javascript
// Modifier les valeurs
WORKER_CONFIG.maxRetries = 5;
WORKER_CONFIG.retryDelay = 3000;
```

### Utilisation directe

```javascript
import { enqueueWithRetry } from './queue/queueWorker.js';

await enqueueWithRetry(
  async () => {
    // Votre code ici
    return await sendMessage('229XXX', 'Test');
  },
  {
    taskName: 'Mon envoi custom',
    maxRetries: 5
  }
);
```

### Statistiques en temps réel

```javascript
import { getWorkerStats } from './queue/queueWorker.js';

const stats = getWorkerStats();
console.log(stats);
// {
//   queueSize: 3,
//   isProcessing: true,
//   config: { ... }
// }
```

---

## 📨 Gestion des messages

### Ajouter une commande personnalisée

Dans `services/messageService.js`, fonction `handleIncomingMessage` :

```javascript
switch (command) {
  case 'ping':
    await message.reply(pongMessage());
    break;

  // Nouvelle commande
  case 'menu':
    await message.reply(`
*🍔 Menu du jour*

• Sandwich poulet - 2500 FCFA
• Sandwich thon - 3000 FCFA
• Boisson - 500 FCFA

Tapez ${monospace('commander')} pour passer commande
    `);
    break;

  // ...
}
```

### Envoyer des médias

```javascript
import { MessageMedia } from 'whatsapp-web.js';

const media = MessageMedia.fromFilePath('./image.jpg');
await client.sendMessage(chatId, media, {
  caption: 'Légende de l\'image'
});
```

### Envoyer avec boutons (pas supporté officiellement)

WhatsApp Business API uniquement - pas disponible avec whatsapp-web.js.

---

## 🔗 Webhooks

### Configuration webhook externe

Ajoutez un endpoint qui appelle votre serveur :

```javascript
// Exemple : webhook Zapier, Make.com, etc.
POST https://votre-app.onrender.com/webhook
Headers:
  x-api-key: votre_cle
  Content-Type: application/json

Body:
{
  "event": "send_message",
  "data": {
    "number": "229XXXXXXXX",
    "message": "Hello from webhook"
  }
}
```

### Personnaliser le handler

Dans `middlewares/apiHandler.js` :

```javascript
export const webhookHandler = asyncHandler(async (req, res) => {
  const { event, data } = req.body;

  switch (event) {
    case 'send_message':
      await sendMessage(data.number, data.message);
      break;

    case 'send_notification':
      const message = customNotification(data.title, data.items);
      await sendMessage(data.number, message);
      break;

    case 'send_bulk':
      await sendBulkMessages(data.numbers, data.message);
      break;

    default:
      throw createHttpError(400, `Event "${event}" non reconnu`);
  }

  res.json({ success: true, event, processed: true });
});
```

---

## 🔐 Sécurité

### Générer une clé API sécurisée

```bash
# Linux/Mac
openssl rand -hex 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Résultat exemple :
# api_key_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

### Utiliser plusieurs clés API

Modifiez `middlewares/authMiddleware.js` :

```javascript
const VALID_API_KEYS = [
  process.env.API_KEY_1,
  process.env.API_KEY_2,
  process.env.API_KEY_ADMIN
];

export function authMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!VALID_API_KEYS.includes(apiKey)) {
    return res.status(403).json({
      success: false,
      error: 'Clé API invalide'
    });
  }

  next();
}
```

### Rate limiting

Installez le package :
```bash
npm install express-rate-limit
```

Ajoutez dans `server.js` :

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes max par IP
  message: {
    success: false,
    error: 'Trop de requêtes, réessayez plus tard'
  }
});

app.use('/send', limiter);
```

### Validation avancée

```javascript
import { body, validationResult } from 'express-validator';

app.post('/send',
  authMiddleware,
  [
    body('number')
      .isString()
      .matches(/^[0-9]{8,15}$/)
      .withMessage('Numéro invalide'),
    body('message')
      .isString()
      .trim()
      .isLength({ min: 1, max: 4096 })
      .withMessage('Message invalide')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Traitement...
  }
);
```

---

## 🔍 Logs et monitoring

### Logs structurés

Installez Winston :
```bash
npm install winston
```

Créez `utils/logger.js` :

```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export default logger;
```

Utilisez dans vos modules :

```javascript
import logger from './utils/logger.js';

logger.info('Message envoyé', { to: number, messageId });
logger.error('Erreur envoi', { error: error.message });
```

---

## 🧪 Tests unitaires

Créez `tests/messageService.test.js` :

```javascript
import { formatPhoneNumber } from '../services/messageService.js';
import assert from 'assert';

describe('MessageService', () => {
  it('devrait formater un numéro correctement', () => {
    const result = formatPhoneNumber('229 12 34 56 78');
    assert.strictEqual(result, '22912345678@c.us');
  });
});
```

Ajoutez dans `package.json` :

```json
{
  "scripts": {
    "test": "node --test tests/**/*.test.js"
  }
}
```

---

## 📊 Métriques et analytics

### Tracker les envois

Ajoutez dans `services/messageService.js` :

```javascript
const stats = {
  sent: 0,
  failed: 0,
  received: 0
};

export async function sendMessage(number, message) {
  try {
    const result = await /* ... */;
    stats.sent++;
    return result;
  } catch (error) {
    stats.failed++;
    throw error;
  }
}

export function getStats() {
  return { ...stats };
}
```

Endpoint pour les stats :

```javascript
app.get('/stats', authMiddleware, (req, res) => {
  res.json({
    success: true,
    data: getStats()
  });
});
```

---

## 🔧 Configuration avancée

### Variables d'environnement complètes

```env
# Serveur
PORT=3000
NODE_ENV=production

# Sécurité
API_KEY=votre_cle_secrete

# WhatsApp
WHATSAPP_TIMEOUT=30000
WHATSAPP_MAX_RETRIES=3

# Queue
QUEUE_RETRY_DELAY=2000
QUEUE_MAX_RETRIES=3

# Logs
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

Utilisez dans votre code :

```javascript
const config = {
  whatsapp: {
    timeout: parseInt(process.env.WHATSAPP_TIMEOUT) || 30000,
    maxRetries: parseInt(process.env.WHATSAPP_MAX_RETRIES) || 3
  },
  queue: {
    retryDelay: parseInt(process.env.QUEUE_RETRY_DELAY) || 2000,
    maxRetries: parseInt(process.env.QUEUE_MAX_RETRIES) || 3
  }
};
```

---

## 🚀 Optimisations

### 1. Cache des contacts

```javascript
const contactCache = new Map();

async function getCachedContact(number) {
  if (contactCache.has(number)) {
    return contactCache.get(number);
  }

  const contact = await client.getContactById(formatPhoneNumber(number));
  contactCache.set(number, contact);
  return contact;
}
```

### 2. Compression des réponses

```javascript
import compression from 'compression';
app.use(compression());
```

### 3. Batch processing

```javascript
async function processBatch(numbers, message, batchSize = 10) {
  for (let i = 0; i < numbers.length; i += batchSize) {
    const batch = numbers.slice(i, i + batchSize);
    await Promise.all(batch.map(num => sendMessage(num, message)));
    await delay(5000); // Pause entre batches
  }
}
```

---

**Pour plus d'aide, consultez la documentation officielle de [whatsapp-web.js](https://wwebjs.dev/)**
