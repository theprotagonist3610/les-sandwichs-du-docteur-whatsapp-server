# 📮 Exemples de tests avec Postman

## Configuration initiale

1. **Base URL** : `http://localhost:3000` (local) ou `https://votre-app.onrender.com` (production)
2. **Header global** : `x-api-key: votre_cle_secrete`

---

## 1. Health Check (Status du serveur)

### GET `/`

**Headers :**
```
(Aucun header requis)
```

**Réponse attendue (200 OK) :**
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
      "pushname": "Mon Nom"
    },
    "queue": {
      "queueSize": 0,
      "isProcessing": false
    }
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## 2. Envoyer un message simple

### POST `/send`

**Headers :**
```
Content-Type: application/json
x-api-key: votre_cle_secrete
```

**Body (raw JSON) :**
```json
{
  "number": "229XXXXXXXX",
  "message": "Bonjour ! Ceci est un test depuis l'API."
}
```

**Réponse attendue (200 OK) :**
```json
{
  "success": true,
  "message": "Message envoyé avec succès",
  "data": {
    "success": true,
    "messageId": "true_229XXXXXXXX@c.us_3EB0XXXXX",
    "timestamp": 1705315800,
    "to": "229XXXXXXXX"
  }
}
```

---

## 3. Envoyer un message formaté

### POST `/send`

**Headers :**
```
Content-Type: application/json
x-api-key: votre_cle_secrete
```

**Body (raw JSON) :**
```json
{
  "number": "229XXXXXXXX",
  "message": "*Titre en gras*\n\n_Texte en italique_\n\n```Code monospace```\n\n~Texte barré~"
}
```

---

## 4. Envoyer des messages groupés

### POST `/send/bulk`

**Headers :**
```
Content-Type: application/json
x-api-key: votre_cle_secrete
```

**Body (raw JSON) :**
```json
{
  "numbers": [
    "229XXXXXXXX",
    "229YYYYYYYY",
    "229ZZZZZZZZ"
  ],
  "message": "Message envoyé à plusieurs destinataires !"
}
```

**Réponse attendue (200 OK) :**
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
        "messageId": "...",
        "timestamp": 1705315800,
        "to": "229XXXXXXXX"
      },
      {
        "number": "229YYYYYYYY",
        "success": true,
        "messageId": "...",
        "timestamp": 1705315802,
        "to": "229YYYYYYYY"
      },
      {
        "number": "229ZZZZZZZZ",
        "success": true,
        "messageId": "...",
        "timestamp": 1705315804,
        "to": "229ZZZZZZZZ"
      }
    ]
  }
}
```

---

## 5. Webhook (notification externe)

### POST `/webhook`

**Headers :**
```
Content-Type: application/json
x-api-key: votre_cle_secrete
```

**Body (raw JSON) :**
```json
{
  "event": "send_message",
  "data": {
    "number": "229XXXXXXXX",
    "message": "Message via webhook"
  }
}
```

**Réponse attendue (200 OK) :**
```json
{
  "success": true,
  "message": "Webhook traité",
  "received": {
    "event": "send_message",
    "data": {
      "number": "229XXXXXXXX",
      "message": "Message via webhook"
    }
  }
}
```

---

## 6. Statistiques de la file d'attente

### GET `/queue/stats`

**Headers :**
```
x-api-key: votre_cle_secrete
```

**Réponse attendue (200 OK) :**
```json
{
  "success": true,
  "data": {
    "queueSize": 0,
    "isProcessing": false,
    "config": {
      "maxRetries": 3,
      "retryDelay": 2000,
      "taskTimeout": 30000
    }
  }
}
```

---

## 7. Informations du client WhatsApp

### GET `/client/info`

**Headers :**
```
x-api-key: votre_cle_secrete
```

**Réponse attendue (200 OK) :**
```json
{
  "success": true,
  "data": {
    "ready": true,
    "number": "229XXXXXXXX",
    "platform": "android",
    "pushname": "Mon Nom WhatsApp"
  }
}
```

---

## 🚫 Erreurs courantes

### 401 Unauthorized
**Cause :** Clé API manquante

**Réponse :**
```json
{
  "success": false,
  "error": "Clé API manquante",
  "message": "Veuillez fournir un header \"x-api-key\""
}
```

---

### 403 Forbidden
**Cause :** Clé API invalide

**Réponse :**
```json
{
  "success": false,
  "error": "Clé API invalide",
  "message": "La clé API fournie n'est pas valide"
}
```

---

### 400 Bad Request
**Cause :** Champ manquant ou invalide

**Réponse :**
```json
{
  "success": false,
  "error": "Le champ \"number\" est requis"
}
```

---

### 503 Service Unavailable
**Cause :** Client WhatsApp non connecté

**Réponse :**
```json
{
  "success": false,
  "error": "Client WhatsApp non connecté. Veuillez réessayer dans quelques instants."
}
```

---

### 404 Not Found
**Cause :** Route inexistante

**Réponse :**
```json
{
  "success": false,
  "error": "Route non trouvée",
  "message": "La route POST /invalid n'existe pas",
  "availableRoutes": {
    "GET": ["/"],
    "POST": ["/send", "/webhook"]
  }
}
```

---

## 📦 Collection Postman

Vous pouvez importer cette collection dans Postman :

1. Créez une nouvelle collection "WhatsApp Server"
2. Ajoutez une variable `{{base_url}}` avec la valeur `http://localhost:3000`
3. Ajoutez une variable `{{api_key}}` avec votre clé API
4. Créez les requêtes ci-dessus en utilisant `{{base_url}}` et `{{api_key}}`

---

## 🧪 Tests automatisés Postman

Ajoutez ces scripts dans l'onglet **Tests** de chaque requête :

```javascript
// Test pour /send
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has success field", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('success');
    pm.expect(jsonData.success).to.be.true;
});

pm.test("Message was sent", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data).to.have.property('messageId');
});
```

---

**Bon test ! 🚀**
