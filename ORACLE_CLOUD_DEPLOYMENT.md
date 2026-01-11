# Déploiement sur Oracle Cloud Always Free

## Pourquoi Oracle Cloud pour WhatsApp ?

- ✅ **Gratuit à vie** - vraiment free, pas de limite de temps
- ✅ **2 VMs Always Free** - 1GB RAM chacune (ampere ARM) ou 1 VM x86
- ✅ **200GB stockage** - sessions WhatsApp préservées indéfiniment
- ✅ **10TB bande passante/mois** - pas de souci de traffic
- ✅ **Uptime 99.95%** - infrastructure professionnelle
- ✅ **Contrôle total** - VPS complet sous votre contrôle

**Meilleur choix long terme** si vous acceptez une configuration initiale plus technique.

---

## Prérequis

- Compte Oracle Cloud (gratuit)
- Connaissances basiques Linux/SSH
- Client SSH (PuTTY sur Windows ou terminal sur Mac/Linux)

---

## Étape 1: Créer le compte Oracle Cloud

### 1.1 Inscription

1. Aller sur [oracle.com/cloud/free](https://www.oracle.com/cloud/free/)
2. Cliquer sur **Start for free**
3. Remplir le formulaire:
   - Email
   - Pays (choisir une région proche: Europe - Frankfurt)
   - Téléphone (nécessaire pour vérification)
   - **Carte bancaire** (pour vérification, pas de débit)

⚠️ **Important**: Oracle vérifie l'identité avec une carte, mais ne débite **JAMAIS** le compte si vous restez sur le tier gratuit.

### 1.2 Activation

- Vérifier l'email et activer le compte
- Attendre ~10 minutes pour l'activation complète
- Se connecter sur [cloud.oracle.com](https://cloud.oracle.com)

---

## Étape 2: Créer une instance VM

### 2.1 Accéder à Compute Instances

1. Dashboard Oracle Cloud → **Menu hamburger** (≡)
2. **Compute** → **Instances**
3. Cliquer sur **Create Instance**

### 2.2 Configuration de l'instance

**Name**: `whatsapp-server`

**Image and Shape**:
- **Image**: Ubuntu 22.04 (Canonical Ubuntu)
- **Shape**:
  - Option 1 (recommandé): `VM.Standard.A1.Flex` (ARM, 4 OCPU, 24GB RAM gratuit)
  - Option 2: `VM.Standard.E2.1.Micro` (x86, 1 OCPU, 1GB RAM)

💡 **Astuce**: Les instances ARM A1 sont plus puissantes et gratuites (jusqu'à 4 OCPU + 24GB RAM combinés)

**Networking**:
- Créer un nouveau VCN (Virtual Cloud Network) automatiquement
- **Assign a public IPv4 address**: ✅ Oui

**Add SSH keys**:
- **Generate SSH key pair** → Télécharger les clés privée et publique
- ⚠️ **Sauvegarder la clé privée** (ssh-key-xxxx.key) en lieu sûr

**Boot volume**:
- **Size**: 50 GB (gratuit jusqu'à 200GB total)

### 2.3 Créer l'instance

- Cliquer sur **Create**
- Attendre 2-3 minutes (statut: Running ✅)
- Noter l'**adresse IP publique** (ex: 132.145.XXX.XXX)

---

## Étape 3: Configurer le Firewall Oracle

### 3.1 Ouvrir le port 3000 (API)

1. **Instance Details** → **Virtual cloud network** (cliquer sur le nom)
2. **Security Lists** → **Default Security List**
3. **Add Ingress Rules**:

```
Stateless: No
Source Type: CIDR
Source CIDR: 0.0.0.0/0
IP Protocol: TCP
Source Port Range: All
Destination Port Range: 3000
Description: WhatsApp Server API
```

4. Cliquer sur **Add Ingress Rules**

### 3.2 Ouvrir le port 80 (optionnel, pour nginx)

Répéter avec:
- **Destination Port Range**: 80
- **Description**: HTTP

### 3.3 Ouvrir le port 443 (optionnel, pour HTTPS)

Répéter avec:
- **Destination Port Range**: 443
- **Description**: HTTPS

---

## Étape 4: Se connecter en SSH

### 4.1 Depuis Windows (PuTTY)

1. Télécharger [PuTTY](https://www.putty.org/)
2. Convertir la clé SSH:
   - Ouvrir **PuTTYgen**
   - Load → sélectionner `ssh-key-xxxx.key`
   - Save private key → `whatsapp-server.ppk`
3. Ouvrir PuTTY:
   - **Host Name**: `ubuntu@132.145.XXX.XXX` (votre IP)
   - **Port**: 22
   - **Connection → SSH → Auth**: Browse → sélectionner `whatsapp-server.ppk`
   - **Open**

### 4.2 Depuis Mac/Linux

```bash
# Donner les permissions à la clé
chmod 400 ~/Downloads/ssh-key-xxxx.key

# Se connecter
ssh -i ~/Downloads/ssh-key-xxxx.key ubuntu@132.145.XXX.XXX
```

---

## Étape 5: Configurer le firewall Ubuntu (iptables)

Une fois connecté en SSH:

```bash
# Configurer iptables pour autoriser le port 3000
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT
sudo netfilter-persistent save

# Vérifier
sudo iptables -L -n | grep 3000
```

---

## Étape 6: Installer Docker et Docker Compose

### 6.1 Mise à jour du système

```bash
sudo apt update && sudo apt upgrade -y
```

### 6.2 Installation Docker

```bash
# Installer les dépendances
sudo apt install -y ca-certificates curl gnupg lsb-release

# Ajouter la clé GPG Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Ajouter le repository Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Installer Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Ajouter l'utilisateur au groupe docker
sudo usermod -aG docker $USER
newgrp docker

# Vérifier l'installation
docker --version
docker compose version
```

### 6.3 Installation de Git

```bash
sudo apt install -y git
git --version
```

---

## Étape 7: Déployer le serveur WhatsApp

### 7.1 Cloner le repository

```bash
cd ~
git clone https://github.com/votre-username/les-sandwichs-du-docteur-whatsapp-server.git
cd les-sandwichs-du-docteur-whatsapp-server
```

### 7.2 Créer le fichier .env

```bash
nano .env
```

Contenu:
```env
PORT=3000
NODE_ENV=production
API_KEY=sk_9fa142dd2e6ef26de155bb3f703117d9e8bcd145acd6e9fb3855a94c32eb6114
```

Sauvegarder: `Ctrl+X` → `Y` → `Enter`

### 7.3 Créer le dossier session

```bash
mkdir -p session
chmod 755 session
```

### 7.4 Builder l'image Docker

```bash
docker build -t whatsapp-server .
```

⏳ Cela prend 5-10 minutes (installation de Chromium et dépendances)

### 7.5 Lancer le container

```bash
docker run -d \
  --name whatsapp-server \
  --restart unless-stopped \
  -p 3000:3000 \
  -v $(pwd)/session:/app/session \
  -v $(pwd)/api-keys.json:/app/api-keys.json \
  --env-file .env \
  whatsapp-server
```

**Options expliquées**:
- `-d`: Détaché (background)
- `--restart unless-stopped`: Redémarre automatiquement si crash
- `-p 3000:3000`: Expose le port 3000
- `-v $(pwd)/session:/app/session`: Monte le dossier session (persistent)
- `--env-file .env`: Charge les variables d'environnement

### 7.6 Vérifier les logs

```bash
# Voir les logs en temps réel
docker logs -f whatsapp-server

# Vous devriez voir:
# [INFO] WhatsApp client initializing...
# [INFO] Server running on port 3000
# [QR] QR Code: [ASCII QR code]
```

---

## Étape 8: Scanner le QR Code

### 8.1 Récupérer le QR Code

**Option 1: Via les logs**
```bash
docker logs whatsapp-server | grep -A 20 "QR Code"
```

Scanner le QR code ASCII dans le terminal avec WhatsApp sur votre téléphone.

**Option 2: Via l'API** (plus pratique)

Depuis votre ordinateur local:
```bash
curl -H "x-api-key: sk_9fa142dd2e6ef26de155bb3f703117d9e8bcd145acd6e9fb3855a94c32eb6114" \
  http://132.145.XXX.XXX:3000/api/qr
```

Ouvrir l'URL du QR code dans un navigateur et scanner avec WhatsApp.

### 8.2 Vérifier la connexion

```bash
curl -H "x-api-key: sk_9fa142dd2e6ef26de155bb3f703117d9e8bcd145acd6e9fb3855a94c32eb6114" \
  http://132.145.XXX.XXX:3000/client/info
```

Réponse attendue:
```json
{
  "success": true,
  "client": {
    "isReady": true,
    "phone": "+229XXXXXXXX",
    "platform": "android"
  }
}
```

---

## Étape 9: Tester l'API

### 9.1 Health check

```bash
curl http://132.145.XXX.XXX:3000/
```

### 9.2 Envoyer un message

```bash
curl -X POST http://132.145.XXX.XXX:3000/send \
  -H "Content-Type: application/json" \
  -H "x-api-key: sk_9fa142dd2e6ef26de155bb3f703117d9e8bcd145acd6e9fb3855a94c32eb6114" \
  -d '{
    "number": "22966354957",
    "message": "Hello from Oracle Cloud! 🎉"
  }'
```

---

## Étape 10: Configuration avancée (optionnel)

### 10.1 Setup nginx comme reverse proxy

**Avantages**:
- ✅ Domaine personnalisé (ex: api.votredomaine.com)
- ✅ HTTPS avec Let's Encrypt
- ✅ Protection DDoS

**Installation**:
```bash
sudo apt install -y nginx certbot python3-certbot-nginx

# Créer la configuration nginx
sudo nano /etc/nginx/sites-available/whatsapp-server
```

Contenu:
```nginx
server {
    listen 80;
    server_name 132.145.XXX.XXX;  # Remplacer par votre domaine

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

**Activer et redémarrer**:
```bash
sudo ln -s /etc/nginx/sites-available/whatsapp-server /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 10.2 Setup HTTPS avec Let's Encrypt

⚠️ **Nécessite un domaine** pointant vers votre IP Oracle

```bash
sudo certbot --nginx -d api.votredomaine.com
```

### 10.3 Créer un script de backup automatique

```bash
nano ~/backup-whatsapp.sh
```

Contenu:
```bash
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Créer le dossier backup
mkdir -p $BACKUP_DIR

# Backup session
tar -czf $BACKUP_DIR/session_$DATE.tar.gz session/

# Backup api-keys
cp api-keys.json $BACKUP_DIR/api-keys_$DATE.json

# Garder seulement les 7 derniers backups
find $BACKUP_DIR -name "session_*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "api-keys_*.json" -mtime +7 -delete

echo "Backup completed: $DATE"
```

Rendre exécutable:
```bash
chmod +x ~/backup-whatsapp.sh
```

Ajouter au cron (backup quotidien à 2h du matin):
```bash
crontab -e
```

Ajouter:
```
0 2 * * * /home/ubuntu/backup-whatsapp.sh >> /home/ubuntu/backup.log 2>&1
```

---

## Étape 11: Monitoring et maintenance

### 11.1 Vérifier l'état du container

```bash
# Statut
docker ps

# Logs
docker logs whatsapp-server --tail 100

# Utilisation ressources
docker stats whatsapp-server
```

### 11.2 Redémarrer le serveur

```bash
docker restart whatsapp-server
```

### 11.3 Mettre à jour le code

```bash
cd ~/les-sandwichs-du-docteur-whatsapp-server
git pull
docker build -t whatsapp-server .
docker stop whatsapp-server
docker rm whatsapp-server

# Relancer avec la nouvelle image
docker run -d \
  --name whatsapp-server \
  --restart unless-stopped \
  -p 3000:3000 \
  -v $(pwd)/session:/app/session \
  -v $(pwd)/api-keys.json:/app/api-keys.json \
  --env-file .env \
  whatsapp-server
```

### 11.4 Monitorer l'espace disque

```bash
df -h
du -sh session/
```

---

## Comparaison finale: Oracle vs Railway vs Render

| Fonctionnalité | Oracle Cloud Free | Railway Free | Render Free |
|----------------|-------------------|--------------|-------------|
| **Uptime** | ♾️ Illimité 24/7 | 500h/mois (~16h/j) | ♾️ avec sleep 15min |
| **RAM** | 1GB (x86) ou 24GB (ARM) | 8GB partagé | 512MB |
| **Storage** | 200GB | 8GB | 1GB |
| **Bande passante** | 10TB/mois | 100GB/mois | 100GB/mois |
| **Setup** | ⚠️ Technique (VPS) | ✅ Simple (Git) | ✅ Simple (Git) |
| **Contrôle** | ✅ Total | ⚙️ Moyen | ⚙️ Limité |
| **Vraiment gratuit** | ✅ À vie | ⚠️ $5 crédit/mois | ⚠️ Avec limitations |
| **Meilleur pour** | Production long terme | Prototypes/MVP | Tests/Démo |

---

## Conclusion

**Oracle Cloud Always Free est le meilleur choix** pour votre serveur WhatsApp si:

1. ✅ Vous voulez un uptime 24/7 garanti
2. ✅ Vous voulez du gratuit à vie (pas de limite de temps)
3. ✅ Vous êtes à l'aise avec Linux et Docker
4. ✅ Vous voulez contrôle total et performance maximale

**Inconvénient unique**: Setup initial plus technique (~30-45 minutes)

**Mais après**: Serveur stable, performant, gratuit pour toujours! 🎉

---

## Support et dépannage

### Problème: Container ne démarre pas

```bash
docker logs whatsapp-server

# Vérifier les permissions
ls -la session/

# Recréer le dossier
rm -rf session/
mkdir -p session
chmod 755 session
```

### Problème: Chromium crash

```bash
# Augmenter la shared memory
docker run -d \
  --name whatsapp-server \
  --restart unless-stopped \
  --shm-size=2gb \
  -p 3000:3000 \
  -v $(pwd)/session:/app/session \
  --env-file .env \
  whatsapp-server
```

### Problème: Port 3000 déjà utilisé

```bash
# Vérifier ce qui utilise le port
sudo lsof -i :3000

# Ou utiliser un autre port
docker run -d ... -p 8080:3000 ... whatsapp-server
```

### Problème: Session WhatsApp perdue

```bash
# Restaurer depuis backup
tar -xzf ~/backups/session_YYYYMMDD_HHMMSS.tar.gz
docker restart whatsapp-server
```

---

## Prochaines étapes recommandées

1. ✅ Setup nginx + HTTPS (meilleure sécurité)
2. ✅ Configurer un domaine personnalisé
3. ✅ Activer les backups automatiques
4. ✅ Setup monitoring (Uptime Robot, Grafana, etc.)
5. ✅ Configurer fail2ban pour protection brute-force

Votre serveur WhatsApp est maintenant **en production, gratuit à vie, et stable**! 🚀
