# Migration vers Railway.dev

## Pourquoi Railway ?

- **500 heures/mois gratuit** (vs Render qui dort après 15min)
- 8GB RAM, 8GB stockage persistent
- Pas de sleep automatique
- Meilleur pour les services stateful comme WhatsApp

## Étapes de migration

### 1. Créer un compte Railway

1. Aller sur [railway.app](https://railway.app)
2. S'inscrire avec GitHub
3. Vérifier email

### 2. Créer un nouveau projet

```bash
# Installer Railway CLI (optionnel)
npm install -g @railway/cli

# Ou utiliser l'interface web
```

### 3. Déployer depuis GitHub

1. **Dashboard Railway** → New Project → Deploy from GitHub repo
2. Sélectionner votre repo `les-sandwichs-du-docteur-whatsapp-server`
3. Railway détecte automatiquement le Dockerfile

### 4. Configurer les variables d'environnement

Dans **Settings → Variables**:

```env
PORT=3000
NODE_ENV=production
API_KEY=sk_9fa142dd2e6ef26de155bb3f703117d9e8bcd145acd6e9fb3855a94c32eb6114
```

### 5. Ajouter un volume persistent

1. **Settings → Volumes** → New Volume
2. **Mount Path**: `/app/session`
3. **Size**: 1GB (gratuit)

### 6. Configuration Railway (nixpacks.toml)

Le fichier `nixpacks.toml` est déjà présent dans le projet. Il configure:
- Node.js 18 avec Chromium et dépendances système
- Installation automatique de Playwright Chromium
- Variables d'environnement Puppeteer

**Contenu du fichier** (déjà créé):

```toml
[phases.setup]
nixPkgs = ["nodejs_18", "chromium", "nss", "freetype", "harfbuzz", "ca-certificates", "fontconfig"]

[phases.install]
cmds = [
  "npm ci",
  "npx playwright install chromium --with-deps"
]

[start]
cmd = "npm start"

[variables]
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = "false"
PUPPETEER_EXECUTABLE_PATH = "/nix/store/*-chromium-*/bin/chromium"
```

### 7. Générer le domaine

1. **Settings → Networking** → Generate Domain
2. Votre API sera disponible sur `https://votre-projet.up.railway.app`

### 8. Vérifier le déploiement

```bash
# Test health check
curl https://votre-projet.up.railway.app/

# Test avec API key
curl -H "x-api-key: sk_9fa142dd2e6ef26de155bb3f703117d9e8bcd145acd6e9fb3855a94c32eb6114" \
  https://votre-projet.up.railway.app/client/info
```

## Différences avec Render

| Fonctionnalité | Render Free | Railway Free |
|---------------|-------------|--------------|
| Uptime | Sleep après 15min | 500h/mois (~16h/jour) |
| RAM | 512MB | 8GB partagé |
| Storage | 1GB persistent disk | 8GB + volumes |
| Build time | 15min max | Plus flexible |
| Custom domain | Oui | Oui (avec vérification) |

## Coûts après le tier gratuit

- **Railway**: $5/mois de crédit offert, puis pay-as-you-go
  - ~$10-15/mois pour usage modéré
  - Pas de sleep, toujours actif

- **Render**: $7/mois (plan Starter)
  - 750h/mois

## Optimisation des 500h gratuites

Pour maximiser les heures gratuites:

1. **Monitoring intelligent**: N'activez le serveur que quand nécessaire
2. **Horizontal scaling**: Utiliser plusieurs services Railway si besoin
3. **Cron jobs**: Utiliser Railway Cron pour des tâches planifiées

## Support et limites

**Limites Railway Free:**
- 500 heures de compute/mois
- 100GB bande passante sortante
- $5 de crédit gratuit (renouvelé chaque mois)

**Quand upgrader:**
- Si vous dépassez 500h (usage 24/7)
- Si vous avez besoin de plus de bande passante
- Pour supprimer la limite de temps

## Troubleshooting

### Chromium ne démarre pas
```bash
# Railway utilise Nixpacks, assurez-vous que chromium est installé
# Dans nixpacks.toml, vérifiez la présence de "chromium"
```

### Sessions WhatsApp perdues
```bash
# Vérifiez que le volume est bien monté sur /app/session
# Dans les logs Railway, cherchez "Session restored"
```

### Dépassement des 500h
```bash
# Surveillez votre usage dans le dashboard Railway
# Activez les notifications d'usage
```

## Migration des données

Si vous avez des sessions WhatsApp actives sur Render:

1. **Télécharger le session folder** depuis Render
2. **Uploader dans Railway volume** via SFTP ou script
3. Redémarrer le service Railway

## Conclusion

Railway est **meilleur pour votre cas** car:
- ✅ Pas de sleep automatique (contrairement à Render)
- ✅ Plus de ressources (8GB vs 512MB RAM)
- ✅ 500h/mois permettent un usage quasi-continu
- ✅ Parfait pour les services stateful comme WhatsApp

**Migration recommandée** si vous voulez éviter les redémarrages intempestifs de Render.
