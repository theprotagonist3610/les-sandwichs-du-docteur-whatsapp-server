# ⚡ Démarrage Rapide

Guide pour démarrer le serveur WhatsApp en 5 minutes.

## 🚀 Local (Développement)

### 1. Installation
```bash
# Cloner le projet
git clone <votre-repo>
cd whatsapp-server

# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env
```

### 2. Configuration
Éditez `.env` et changez la clé API :
```env
API_KEY=ma_cle_secrete_123
```

### 3. Démarrage
```bash
npm start
```

### 4. Connexion WhatsApp
1. Scannez le QR code qui apparaît dans le terminal
2. Attendez le message "✅ WhatsApp connecté"

### 5. Test
```bash
curl -X POST http://localhost:3000/send \
  -H "Content-Type: application/json" \
  -H "x-api-key: ma_cle_secrete_123" \
  -d '{"number":"229XXXXXXXX","message":"Test"}'
```

---

## 🌍 Render (Production)

### 1. Préparer Git
```bash
git init
git add .
git commit -m "Initial commit"
git push
```

### 2. Créer le service sur Render

1. **render.com** > **New +** > **Web Service**
2. Connectez votre repo GitHub
3. **Build Command** : `npm install`
4. **Start Command** : `npm start`

### 3. Variables d'environnement

| Variable | Valeur |
|----------|--------|
| `API_KEY` | `cle_forte_production` |
| `NODE_ENV` | `production` |

### 4. Ajouter un disque persistant

**Settings** > **Disks** > **Add Disk**
- Name : `session-data`
- Mount Path : `/opt/render/project/src/session`
- Size : `1 GB`

### 5. Scanner le QR Code

1. Onglet **Logs**
2. Attendez le QR code
3. Scannez avec WhatsApp
4. Attendez "✅ WhatsApp connecté"

### 6. Tester
```bash
curl https://votre-app.onrender.com/
```

---

## 📱 Commandes disponibles

Envoyez ces messages à votre bot WhatsApp :

| Message | Réponse |
|---------|---------|
| `ping` | pong ✅ |
| `aide` | Affiche l'aide |
| `info` | Infos sur le bot |

---

## 🐛 Problèmes courants

### "API_KEY non définie"
➜ Vérifiez que `.env` contient `API_KEY=votre_cle`

### "Client WhatsApp non connecté"
➜ Attendez 1-2 minutes après le scan du QR code

### Serveur inactif sur Render
➜ Utilisez UptimeRobot pour ping toutes les 5 minutes

---

## 📖 Documentation complète

Consultez [README.md](README.md) pour la documentation détaillée.

---

**Besoin d'aide ?** Ouvrez une issue sur GitHub.
