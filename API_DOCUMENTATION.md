# Documentation API WhatsApp Server

## Table des matières
1. [Introduction](#introduction)
2. [Authentification](#authentification)
3. [Rate Limiting](#rate-limiting)
4. [Endpoints](#endpoints)
   - [Santé du serveur](#santé-du-serveur)
   - [Envoi de messages](#envoi-de-messages)
   - [Messages](#messages)
   - [Contacts](#contacts)
   - [Médias](#médias)
   - [Chats](#chats)
   - [QR Code](#qr-code)
5. [Codes d'erreur](#codes-derreur)
6. [Exemples complets](#exemples-complets)

---

## Introduction

API REST pour envoyer et recevoir des messages WhatsApp via whatsapp-web.js.

**Base URL**: `http://localhost:3000` (développement) ou `https://your-app.onrender.com` (production)

**Version**: 1.0.0

---

## Authentification

Toutes les routes protégées nécessitent une clé API dans le header `x-api-key`.

```bash
curl -H "x-api-key: YOUR_API_KEY" http://localhost:3000/client/info
```

### Générer une clé API

```bash
npm run generate-key
```

---

## Rate Limiting

| Type | Limite | Fenêtre |
|------|--------|---------|
| Global | 100 requêtes | 15 minutes |
| Envoi en masse | 5 requêtes | 1 heure |
| Actions sensibles | 10 requêtes | 1 minute |

Les headers de rate limiting sont inclus dans la réponse:
- `X-RateLimit-Limit`: Limite totale
- `X-RateLimit-Remaining`: Requêtes restantes
- `X-RateLimit-Reset`: Timestamp de réinitialisation

---

## Endpoints

### Santé du serveur

#### GET `/`

Vérifie le statut du serveur et du client WhatsApp.

**Réponse**:
```json
{
  "success": true,
  "message": "Server OK ✅",
  "status": {
    "whatsapp": "connected",
    "client": {
      "ready": true,
      "number": "229XXXXXXXX",
      "platform": "android",
      "pushname": "John Doe"
    },
    "queue": {
      "pending": 0,
      "processing": 0,
      "completed": 45,
      "failed": 2
    }
  },
  "timestamp": "2024-01-11T10:30:00.000Z"
}
```

---

### Envoi de messages

#### POST `/send`

Envoie un message texte à un destinataire.

**Authentification**: Requise

**Body**:
```json
{
  "number": "229XXXXXXXX",
  "message": "Bonjour! Ceci est un message de test."
}
```

**Paramètres**:
- `number` (string, requis): Numéro au format international sans '+'
- `message` (string, requis): Contenu du message

**Réponse**:
```json
{
  "success": true,
  "message": "Message envoyé avec succès",
  "data": {
    "success": true,
    "messageId": "true_229XXXXXXXX@c.us_3EB0XXXXX",
    "timestamp": 1704970200,
    "to": "229XXXXXXXX"
  }
}
```

**Exemple cURL**:
```bash
curl -X POST http://localhost:3000/send \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "number": "229XXXXXXXX",
    "message": "Hello World!"
  }'
```

---

#### POST `/send/bulk`

Envoie un message à plusieurs destinataires.

**Authentification**: Requise

**Rate Limit**: 5 requêtes/heure pour plus de 10 destinataires

**Body**:
```json
{
  "numbers": ["229XXXXXXXX", "229YYYYYYYY", "229ZZZZZZZZ"],
  "message": "Message groupé pour tous les destinataires."
}
```

**Paramètres**:
- `numbers` (array, requis): Liste de numéros (max 50)
- `message` (string, requis): Message à envoyer

**Réponse**:
```json
{
  "success": true,
  "message": "3 message(s) envoyé(s), 0 échec(s)",
  "data": {
    "total": 3,
    "success": 3,
    "failures": 0,
    "results": [
      {
        "number": "229XXXXXXXX",
        "success": true,
        "messageId": "true_229XXXXXXXX@c.us_3EB0XXXXX",
        "timestamp": 1704970200,
        "to": "229XXXXXXXX"
      }
    ]
  }
}
```

---

### Messages

#### GET `/api/messages/:chatId`

Récupère l'historique des messages d'un chat.

**Authentification**: Requise

**Paramètres URL**:
- `chatId` (string): ID du chat (ex: `229XXXXXXXX` ou `229XXXXXXXX@c.us`)

**Query params**:
- `limit` (number, optionnel): Nombre de messages (défaut: 50)
- `offset` (number, optionnel): Décalage pour pagination (défaut: 0)

**Réponse**:
```json
{
  "success": true,
  "data": {
    "chatId": "229XXXXXXXX@c.us",
    "total": 120,
    "offset": 0,
    "limit": 50,
    "messages": [
      {
        "id": "true_229XXXXXXXX@c.us_3EB0XXXXX",
        "from": "229XXXXXXXX@c.us",
        "to": "229YYYYYYYY@c.us",
        "body": "Hello!",
        "type": "chat",
        "timestamp": 1704970200,
        "fromMe": true,
        "hasMedia": false,
        "ack": 3,
        "isForwarded": false,
        "isStarred": false
      }
    ]
  }
}
```

**Exemple**:
```bash
curl -H "x-api-key: YOUR_API_KEY" \
  "http://localhost:3000/api/messages/229XXXXXXXX?limit=20&offset=0"
```

---

#### DELETE `/api/messages/:messageId`

Supprime un message.

**Authentification**: Requise (permission admin)

**Paramètres URL**:
- `messageId` (string): ID du message à supprimer

**Body**:
```json
{
  "everyone": true
}
```

**Paramètres**:
- `everyone` (boolean, optionnel): Supprimer pour tout le monde (défaut: false)

**Réponse**:
```json
{
  "success": true,
  "message": "Message supprimé avec succès",
  "data": {
    "messageId": "true_229XXXXXXXX@c.us_3EB0XXXXX",
    "deletedForEveryone": true
  }
}
```

---

### Contacts

#### GET `/api/contacts`

Récupère tous les contacts.

**Authentification**: Requise

**Réponse**:
```json
{
  "success": true,
  "data": {
    "total": 45,
    "contacts": [
      {
        "id": "229XXXXXXXX@c.us",
        "number": "229XXXXXXXX",
        "name": "John Doe",
        "pushname": "John",
        "isMyContact": true,
        "isWAContact": true,
        "profilePicUrl": "https://..."
      }
    ]
  }
}
```

**Exemple**:
```bash
curl -H "x-api-key: YOUR_API_KEY" \
  http://localhost:3000/api/contacts
```

---

#### GET `/api/contacts/:contactId`

Récupère les détails d'un contact.

**Authentification**: Requise

**Paramètres URL**:
- `contactId` (string): ID ou numéro du contact

**Réponse**:
```json
{
  "success": true,
  "data": {
    "id": "229XXXXXXXX@c.us",
    "number": "229XXXXXXXX",
    "name": "John Doe",
    "pushname": "John",
    "isMyContact": true,
    "isWAContact": true,
    "isGroup": false,
    "profilePicUrl": "https://...",
    "about": "Hey there! I am using WhatsApp."
  }
}
```

---

### Médias

#### POST `/api/media/send`

Envoie un média (image, vidéo, document).

**Authentification**: Requise

**Content-Type**: `multipart/form-data`

**Form Data**:
- `file` (file, requis): Fichier à envoyer (max 16MB)
- `number` (string, requis): Numéro du destinataire
- `caption` (string, optionnel): Légende pour le média

**Types supportés**:
- Images: JPEG, PNG, GIF, WebP
- Vidéos: MP4, 3GPP
- Audio: MP3, OGG
- Documents: PDF, DOC, DOCX

**Réponse**:
```json
{
  "success": true,
  "message": "Média envoyé avec succès",
  "data": {
    "messageId": "true_229XXXXXXXX@c.us_3EB0XXXXX",
    "to": "229XXXXXXXX",
    "fileName": "photo.jpg",
    "fileSize": 245678,
    "mimeType": "image/jpeg",
    "caption": "Ma photo de vacances"
  }
}
```

**Exemple cURL**:
```bash
curl -X POST http://localhost:3000/api/media/send \
  -H "x-api-key: YOUR_API_KEY" \
  -F "file=@/path/to/photo.jpg" \
  -F "number=229XXXXXXXX" \
  -F "caption=Ma photo"
```

**Exemple JavaScript**:
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('number', '229XXXXXXXX');
formData.append('caption', 'Ma photo');

fetch('http://localhost:3000/api/media/send', {
  method: 'POST',
  headers: {
    'x-api-key': 'YOUR_API_KEY'
  },
  body: formData
});
```

---

### Chats

#### GET `/api/chats`

Liste tous les chats (conversations).

**Authentification**: Requise

**Réponse**:
```json
{
  "success": true,
  "data": {
    "total": 23,
    "chats": [
      {
        "id": "229XXXXXXXX@c.us",
        "name": "John Doe",
        "isGroup": false,
        "isReadOnly": false,
        "unreadCount": 3,
        "timestamp": 1704970200,
        "archived": false,
        "pinned": true,
        "muteExpiration": 0
      }
    ]
  }
}
```

---

### QR Code

#### GET `/api/qr`

Récupère le statut de connexion du QR code.

**Authentification**: Requise

**Réponse (connecté)**:
```json
{
  "success": true,
  "message": "Client déjà connecté",
  "connected": true
}
```

**Réponse (non connecté)**:
```json
{
  "success": false,
  "message": "QR code non disponible. Le client n'est pas en phase de connexion.",
  "info": "Redémarrez le serveur pour obtenir un nouveau QR code"
}
```

---

### Webhook

#### POST `/webhook`

Endpoint webhook pour recevoir des notifications d'événements externes.

**Authentification**: Requise

**Body**:
```json
{
  "event": "send_message",
  "data": {
    "number": "229XXXXXXXX",
    "message": "Message depuis webhook"
  }
}
```

**Réponse**:
```json
{
  "success": true,
  "message": "Webhook traité",
  "received": {
    "event": "send_message",
    "data": {...}
  }
}
```

---

### Statistiques

#### GET `/queue/stats`

Récupère les statistiques de la file d'attente.

**Authentification**: Requise

**Réponse**:
```json
{
  "success": true,
  "data": {
    "pending": 0,
    "processing": 1,
    "completed": 156,
    "failed": 3
  }
}
```

---

#### GET `/client/info`

Récupère les informations du client WhatsApp.

**Authentification**: Requise

**Réponse**:
```json
{
  "success": true,
  "data": {
    "ready": true,
    "number": "229XXXXXXXX",
    "platform": "android",
    "pushname": "John Doe"
  }
}
```

---

## Codes d'erreur

| Code | Description |
|------|-------------|
| 200 | Succès |
| 400 | Requête invalide |
| 401 | Clé API manquante |
| 403 | Clé API invalide ou permission insuffisante |
| 404 | Ressource introuvable |
| 429 | Trop de requêtes (rate limit) |
| 500 | Erreur serveur |
| 503 | Service indisponible (WhatsApp déconnecté) |

**Format d'erreur**:
```json
{
  "success": false,
  "error": "Titre de l'erreur",
  "message": "Description détaillée de l'erreur"
}
```

---

## Exemples complets

### Node.js avec Axios

```javascript
const axios = require('axios');

const API_KEY = 'your_api_key_here';
const BASE_URL = 'http://localhost:3000';

// Envoyer un message
async function sendMessage(number, message) {
  try {
    const response = await axios.post(
      `${BASE_URL}/send`,
      { number, message },
      {
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('Message envoyé:', response.data);
  } catch (error) {
    console.error('Erreur:', error.response?.data || error.message);
  }
}

sendMessage('229XXXXXXXX', 'Bonjour!');
```

### Python avec Requests

```python
import requests

API_KEY = 'your_api_key_here'
BASE_URL = 'http://localhost:3000'

def send_message(number, message):
    headers = {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
    }
    data = {
        'number': number,
        'message': message
    }

    response = requests.post(f'{BASE_URL}/send', json=data, headers=headers)

    if response.status_code == 200:
        print('Message envoyé:', response.json())
    else:
        print('Erreur:', response.json())

send_message('229XXXXXXXX', 'Bonjour!')
```

### PHP avec cURL

```php
<?php
$apiKey = 'your_api_key_here';
$baseUrl = 'http://localhost:3000';

function sendMessage($number, $message) {
    global $apiKey, $baseUrl;

    $ch = curl_init("$baseUrl/send");

    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        "x-api-key: $apiKey"
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'number' => $number,
        'message' => $message
    ]));

    $response = curl_exec($ch);
    curl_close($ch);

    return json_decode($response, true);
}

$result = sendMessage('229XXXXXXXX', 'Bonjour!');
print_r($result);
?>
```

---

## Support

Pour toute question ou problème:
- GitHub Issues: https://github.com/your-repo/issues
- Email: support@example.com

---

**Dernière mise à jour**: 2024-01-11
