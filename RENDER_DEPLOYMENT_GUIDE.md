# Guide de Déploiement sur Render

## Table des matières
1. [Prérequis](#prérequis)
2. [Préparation du projet](#préparation-du-projet)
3. [Création du service Render](#création-du-service-render)
4. [Configuration des variables d'environnement](#configuration-des-variables-denvironnement)
5. [Configuration du disque persistant](#configuration-du-disque-persistant)
6. [Déploiement](#déploiement)
7. [Connexion WhatsApp](#connexion-whatsapp)
8. [Vérification et tests](#vérification-et-tests)
9. [Dépannage](#dépannage)

---

## Prérequis

- Compte GitHub avec le projet pushé
- Compte Render (gratuit) : https://render.com
- Clé API générée localement
- Git installé localement

---

## Préparation du projet

### 1. Vérifier les fichiers essentiels

Assurez-vous que ces fichiers sont présents dans votre projet:

✅ `render.yaml` - Configuration Render
✅ `Dockerfile` - Image Docker optimisée
✅ `.dockerignore` - Fichiers à ignorer
✅ `package.json` - Dépendances Node.js
✅ `.gitignore` - Fichiers à ne pas commiter

### 2. Générer une clé API sécurisée

```bash
npm run generate-key
```

Copiez la clé générée, vous en aurez besoin sur Render.

### 3. Pousser sur GitHub

```bash
git add .
git commit -m "Préparation déploiement Render"
git push origin main
```

---

## Création du service Render

### Étape 1: Connecter GitHub

1. Allez sur https://dashboard.render.com
2. Cliquez sur **"New +"** > **"Web Service"**
3. Connectez votre compte GitHub si ce n'est pas déjà fait
4. Sélectionnez votre repository `les-sandwichs-du-docteur-whatsapp-server`

### Étape 2: Configuration de base

Remplissez les champs suivants:

| Champ | Valeur |
|-------|--------|
| **Name** | `whatsapp-server` (ou votre choix) |
| **Region** | `Frankfurt (EU Central)` (recommandé pour l'Europe) |
| **Branch** | `main` |
| **Root Directory** | (laissez vide) |
| **Environment** | `Docker` |
| **Instance Type** | `Free` |

### Étape 3: Configuration avancée

Cliquez sur **"Advanced"** et configurez:

#### Build Command
```bash
npm install && npx playwright install chromium --with-deps
```

#### Start Command
```bash
npm start
```

---

## Configuration des variables d'environnement

Dans la section **"Environment Variables"** de Render, ajoutez:

### Variables obligatoires

| Variable | Valeur | Description |
|----------|--------|-------------|
| `NODE_ENV` | `production` | Mode production |
| `PORT` | `10000` | Port du serveur (Render utilise 10000) |
| `API_KEY` | `sk_xxxx...` | Votre clé API générée |

### Variables optionnelles (sécurité)

| Variable | Valeur par défaut | Description |
|----------|-------------------|-------------|
| `RATE_LIMIT_WINDOW_MS` | `900000` | Fenêtre rate limit (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Requêtes max par fenêtre |
| `CORS_ORIGIN` | `*` | Origines CORS autorisées |

### Variables Puppeteer (important!)

| Variable | Valeur |
|----------|--------|
| `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` | `true` |
| `PUPPETEER_EXECUTABLE_PATH` | `/root/.cache/ms-playwright/chromium-*/chrome-linux/chrome` |

**Exemple de configuration complète**:

```env
NODE_ENV=production
PORT=10000
API_KEY=whatsapp_api_key_here_replace_with_generated_key
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=*
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/root/.cache/ms-playwright/chromium-*/chrome-linux/chrome
```

---

## Configuration du disque persistant

⚠️ **CRITIQUE**: WhatsApp nécessite un disque persistant pour sauvegarder la session.

### Étape 1: Ajouter un disque

Dans la configuration Render:

1. Scrollez vers le bas jusqu'à **"Disks"**
2. Cliquez sur **"Add Disk"**
3. Configurez:

| Champ | Valeur |
|-------|--------|
| **Name** | `whatsapp-session-data` |
| **Mount Path** | `/opt/render/project/src/session` |
| **Size** | `1 GB` (suffisant) |

### Étape 2: Vérifier le render.yaml

Le fichier `render.yaml` doit contenir:

```yaml
disk:
  name: whatsapp-session-data
  mountPath: /opt/render/project/src/session
  sizeGB: 1
```

---

## Déploiement

### Lancer le déploiement

1. Cliquez sur **"Create Web Service"**
2. Render va:
   - Cloner votre repository
   - Construire l'image Docker
   - Installer les dépendances
   - Démarrer le serveur

### Suivre les logs

```
==> Cloning from GitHub...
==> Building Docker image...
==> Installing dependencies...
==> Starting server...
📱 [WhatsApp] QR Code généré. Scannez-le avec votre téléphone:
```

⏱️ **Durée**: 3-5 minutes pour le premier déploiement.

---

## Connexion WhatsApp

### Méthode 1: Via les logs Render

1. Allez dans **"Logs"** de votre service
2. Cherchez le QR code ASCII dans les logs:
```
📱 [WhatsApp] QR Code généré
████ ▄▄▄▄▄ █▀█ █▄▄█▄▄▀█ ▄▄▄▄▄ ████
████ █   █ █▀▀▀█ ▀ ▀▀▀█ █   █ ████
...
```

3. Ouvrez WhatsApp sur votre téléphone
4. Allez dans **"Appareils connectés"** > **"Connecter un appareil"**
5. Scannez le QR code affiché dans les logs

### Méthode 2: Via endpoint API (futur)

```bash
curl https://your-app.onrender.com/api/qr \
  -H "x-api-key: YOUR_API_KEY"
```

### Vérifier la connexion

Après le scan, vous devriez voir dans les logs:

```
🔐 [WhatsApp] Authentification réussie
✅ [WhatsApp] Client connecté et prêt !
📞 [WhatsApp] Numéro: 229XXXXXXXX
```

---

## Vérification et tests

### 1. Tester le health check

```bash
curl https://your-app.onrender.com/
```

Réponse attendue:
```json
{
  "success": true,
  "message": "Server OK ✅",
  "status": {
    "whatsapp": "connected",
    "client": {
      "ready": true,
      "number": "229XXXXXXXX"
    }
  }
}
```

### 2. Tester l'envoi de message

```bash
curl -X POST https://your-app.onrender.com/send \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "number": "229XXXXXXXX",
    "message": "Test depuis Render!"
  }'
```

### 3. Vérifier les contacts

```bash
curl https://your-app.onrender.com/api/contacts \
  -H "x-api-key: YOUR_API_KEY"
```

---

## Dépannage

### ❌ Erreur: Client WhatsApp non connecté

**Problème**: Le serveur démarre mais WhatsApp n'est pas connecté.

**Solution**:
1. Vérifiez les logs pour le QR code
2. Assurez-vous que le disque persistant est bien configuré
3. Redémarrez le service: **"Manual Deploy"** > **"Clear build cache & deploy"**

### ❌ Erreur: Chromium not found

**Problème**: Puppeteer ne trouve pas Chromium.

**Solution**:
1. Vérifiez la build command:
   ```bash
   npm install && npx playwright install chromium --with-deps
   ```
2. Vérifiez les variables d'environnement `PUPPETEER_*`
3. Utilisez le Dockerfile au lieu du build command natif

### ❌ Erreur: 503 Service Unavailable

**Problème**: Le serveur ne répond pas.

**Solution**:
1. Vérifiez que le service est démarré dans le dashboard Render
2. Consultez les logs pour voir les erreurs
3. Vérifiez que le port `10000` est bien configuré

### ❌ Erreur: Session perdue après redémarrage

**Problème**: WhatsApp se déconnecte à chaque redémarrage.

**Solution**:
1. **CRITIQUE**: Vérifiez que le disque persistant est bien configuré
2. Vérifiez le mount path: `/opt/render/project/src/session`
3. Le free tier de Render peut avoir des limitations

### ❌ Erreur: Out of memory

**Problème**: Le serveur crashe avec une erreur de mémoire.

**Solution**:
1. Le free tier de Render a 512MB de RAM
2. Optimisez les arguments Puppeteer dans `whatsappClient.js`:
   ```javascript
   args: [
     '--no-sandbox',
     '--disable-setuid-sandbox',
     '--disable-dev-shm-usage',  // Important!
     '--disable-gpu'
   ]
   ```
3. Envisagez un upgrade vers un plan payant

### ⚠️ Rate limit atteint

**Problème**: Trop de requêtes.

**Solution**:
1. Vérifiez les headers de rate limiting
2. Ajustez `RATE_LIMIT_WINDOW_MS` et `RATE_LIMIT_MAX_REQUESTS`
3. Utilisez plusieurs clés API pour différents clients

---

## Maintenance

### Mise à jour du code

```bash
git add .
git commit -m "Update: nouvelle fonctionnalité"
git push origin main
```

Render redéploiera automatiquement.

### Rotation de clé API

```bash
# Localement
npm run rotate-key list
npm run rotate-key rotate key_abc123

# Sur Render
1. Allez dans "Environment"
2. Modifiez la variable API_KEY
3. Cliquez "Save Changes"
```

### Logs et monitoring

1. **Logs en temps réel**: Dashboard > "Logs"
2. **Métriques**: Dashboard > "Metrics"
3. **Alertes**: Configurez des notifications email

---

## Limites du Free Tier

| Ressource | Limite |
|-----------|--------|
| RAM | 512 MB |
| CPU | 0.1 CPU |
| Disque | 1 GB persistant |
| Bande passante | 100 GB/mois |
| Inactivité | Service en veille après 15 min |

⚠️ **Important**: Le service s'endort après 15 minutes d'inactivité. Première requête = 30-60s de réveil.

**Solutions**:
1. Utiliser un service de ping (UptimeRobot, Cron-job.org)
2. Upgrader vers un plan payant ($7/mois)

---

## URLs utiles

- **Dashboard Render**: https://dashboard.render.com
- **Documentation Render**: https://render.com/docs
- **Support**: https://community.render.com
- **Status**: https://status.render.com

---

## Checklist finale

- [ ] Service Render créé et déployé
- [ ] Variables d'environnement configurées
- [ ] Disque persistant configuré (1GB)
- [ ] QR code scanné et WhatsApp connecté
- [ ] Health check répond correctement
- [ ] Test d'envoi de message réussi
- [ ] API Key stockée en sécurité
- [ ] URL du service notée

**URL de votre service**: `https://whatsapp-server-xxxx.onrender.com`

---

## Support

En cas de problème:
1. Consultez les logs Render
2. Vérifiez cette documentation
3. Ouvrez une issue sur GitHub
4. Contactez le support Render

---

**Dernière mise à jour**: 2024-01-11
**Version**: 1.0.0
