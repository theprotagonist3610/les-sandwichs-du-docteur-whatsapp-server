# 🤖 Serveur WhatsApp avec API REST

Serveur Node.js pour envoyer et recevoir des messages WhatsApp via une API REST. Conçu pour être hébergé gratuitement sur Render.

## 📋 Fonctionnalités

- ✅ Connexion WhatsApp Web avec QR Code
- ✅ API REST pour envoyer des messages
- ✅ Réponses automatiques configurables
- ✅ File d'attente pour gérer les envois simultanés
- ✅ Formatage de texte WhatsApp (gras, italique, etc.)
- ✅ Protection par clé API
- ✅ Compatible Render Free Tier

## 🏗️ Architecture

```
whatsapp-server/
├── format/                  # Formatage des messages
│   ├── textFormat.js       # Utilitaires de style
│   └── messageTemplates.js # Modèles préformatés
├── queue/                   # Gestion de la file d'attente
│   ├── messageQueue.js     # File FIFO
│   └── queueWorker.js      # Retries et priorités
├── services/               # Services WhatsApp
│   ├── whatsappClient.js  # Client WhatsApp Web
│   └── messageService.js  # Envoi/réception
├── middlewares/            # Middlewares Express
│   ├── authMiddleware.js  # Authentification API
│   ├── errorHandler.js    # Gestion des erreurs
│   └── apiHandler.js      # Routes API
└── server.js              # Point d'entrée
```

## 🚀 Installation locale

### Prérequis

- Node.js v18 ou supérieur
- npm ou yarn

### Étapes

1. **Cloner le projet**
   ```bash
   git clone <votre-repo>
   cd whatsapp-server
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configurer l'environnement**
   ```bash
   cp .env.example .env
   ```

   Éditez `.env` et définissez votre clé API :
   ```env
   PORT=3000
   NODE_ENV=development
   API_KEY=votre_cle_secrete
   ```

4. **Démarrer le serveur**
   ```bash
   npm start
   ```

5. **Scanner le QR Code**
   - Un QR code apparaîtra dans le terminal
   - Ouvrez WhatsApp sur votre téléphone
   - Allez dans **Appareils connectés** > **Connecter un appareil**
   - Scannez le QR code

6. **Tester l'API**
   ```bash
   curl -X POST http://localhost:3000/send \
     -H "Content-Type: application/json" \
     -H "x-api-key: votre_cle_secrete" \
     -d '{"number":"229XXXXXXXX","message":"Test"}'
   ```

## 🌍 Déploiement sur Render

### 1. Préparer le dépôt Git

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <votre-repo-github>
git push -u origin main
```

### 2. Créer un Web Service sur Render

1. Allez sur [render.com](https://render.com)
2. Cliquez sur **New +** > **Web Service**
3. Connectez votre dépôt GitHub
4. Configuration :
   - **Name** : `whatsapp-server`
   - **Environment** : `Node`
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
   - **Instance Type** : `Free`

### 3. Configurer les variables d'environnement

Dans l'onglet **Environment** de votre service Render :

| Variable | Valeur |
|----------|--------|
| `API_KEY` | `votre_cle_secrete_forte` |
| `NODE_ENV` | `production` |
| `PORT` | `10000` (par défaut Render) |

### 4. Ajouter un Persistent Disk

1. Dans votre service, allez à **Settings** > **Disks**
2. Cliquez sur **Add Disk**
3. Configuration :
   - **Name** : `session-data`
   - **Mount Path** : `/opt/render/project/src/session`
   - **Size** : `1 GB` (suffisant pour les sessions)

### 5. Scanner le QR Code

1. Allez dans l'onglet **Logs** de votre service
2. Attendez que le QR code s'affiche
3. Scannez-le avec WhatsApp sur votre téléphone
4. Le serveur affichera "✅ WhatsApp connecté"

### 6. Tester votre API

```bash
curl -X POST https://votre-app.onrender.com/send \
  -H "Content-Type: application/json" \
  -H "x-api-key: votre_cle_secrete" \
  -d '{"number":"229XXXXXXXX","message":"Hello from Render!"}'
```

## 📡 API Endpoints

### GET `/`
Status du serveur

**Réponse :**
```json
{
  "success": true,
  "message": "Server OK ✅",
  "status": {
    "whatsapp": "connected",
    "client": { ... },
    "queue": { ... }
  }
}
```

### POST `/send`
Envoyer un message

**Headers :**
- `Content-Type: application/json`
- `x-api-key: votre_cle`

**Body :**
```json
{
  "number": "229XXXXXXXX",
  "message": "Bonjour !"
}
```

**Réponse :**
```json
{
  "success": true,
  "message": "Message envoyé avec succès",
  "data": {
    "messageId": "...",
    "timestamp": 1234567890,
    "to": "229XXXXXXXX"
  }
}
```

### POST `/send/bulk`
Envoyer des messages groupés (max 50)

**Body :**
```json
{
  "numbers": ["229XXX", "229YYY"],
  "message": "Message groupé"
}
```

### GET `/queue/stats`
Statistiques de la file d'attente

**Headers :**
- `x-api-key: votre_cle`

**Réponse :**
```json
{
  "success": true,
  "data": {
    "queueSize": 0,
    "isProcessing": false
  }
}
```

### GET `/client/info`
Informations du client WhatsApp

**Headers :**
- `x-api-key: votre_cle`

## 🎨 Formatage de texte

Utilisez les fonctions de formatage dans vos modules :

```javascript
import { bold, italic, monospace } from './format/textFormat.js';

const message = `${bold("Titre")} - ${italic("Description")}`;
```

Fonctions disponibles :
- `bold(text)` - **Gras**
- `italic(text)` - *Italique*
- `monospace(text)` - `Code`
- `strikethrough(text)` - ~~Barré~~
- `link(label, url)` - [Lien](url)
- `bulletList(items)` - Liste à puces
- `numberedList(items)` - Liste numérotée

## 🤖 Commandes automatiques

Le bot répond automatiquement à ces messages :

| Commande | Réponse |
|----------|---------|
| `ping` | pong ✅ |
| `aide` ou `help` | Message d'aide |
| `info` | Informations sur le bot |

## 🔐 Sécurité

- ✅ Tous les endpoints sensibles sont protégés par clé API
- ✅ Validation des entrées utilisateur
- ✅ Gestion des erreurs centralisée
- ✅ Limitation des envois groupés (50 max)

## 🐛 Dépannage

### Le QR code ne s'affiche pas
- Vérifiez les logs Render
- Redémarrez le service
- Assurez-vous que le Persistent Disk est monté

### "Client WhatsApp non connecté"
- Attendez 1-2 minutes après le scan du QR code
- Vérifiez que votre téléphone est connecté à Internet
- Consultez les logs pour voir si la session est valide

### Erreur "API_KEY non définie"
- Vérifiez que `API_KEY` est bien définie dans les variables d'environnement Render
- Redémarrez le service après avoir ajouté la variable

### Le serveur se déconnecte souvent
- Sur le Free Tier, Render met en veille les services inactifs après 15 min
- Utilisez un service de monitoring (UptimeRobot) pour garder le serveur actif

## 📊 Monitoring

Pour garder votre serveur actif sur Render Free :

1. Créez un compte sur [UptimeRobot](https://uptimerobot.com)
2. Ajoutez un monitor HTTP(S)
3. URL : `https://votre-app.onrender.com/`
4. Interval : 5 minutes

## 🛠️ Développement

### Mode développement
```bash
npm run dev
```

### Structure des modules
- **format/** : Formatage et templates
- **queue/** : File d'attente et workers
- **services/** : Client WhatsApp et services
- **middlewares/** : Auth, erreurs, routes API

## 📝 Licence

ISC

## 🤝 Contribution

Les contributions sont les bienvenues ! Ouvrez une issue ou une pull request.

---

**Développé avec ❤️ par [Votre Nom]**
