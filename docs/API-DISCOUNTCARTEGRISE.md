# API DiscountCarteGrise — Documentation complète

## Sommaire
1. [Configuration](#1-configuration)
2. [Authentification](#2-authentification)
3. [Endpoints](#3-endpoints)
4. [Types de démarches](#4-types-de-démarches)
5. [Documents requis par démarche](#5-documents-requis-par-démarche)
6. [Questions conditionnelles](#6-questions-conditionnelles)
7. [Calcul des prix](#7-calcul-des-prix)
8. [Statuts de commande](#8-statuts-de-commande)
9. [Flux complet d'intégration](#9-flux-complet-dintégration)
10. [Exemples de code](#10-exemples-de-code)

---

## 1. Configuration

### URL de l'API
```
https://oiotlgkfwuwshpwraneb.supabase.co/functions/v1/api-external
```

### Clé API
```
EXTERNAL_API_KEY = edb52633206761a242359346e4f367a91c59aee90a65689cfb3eda3b43949aa4
```

> **Important** : Cette clé doit être ajoutée dans Supabase Dashboard → Edge Functions → Secrets sous le nom `EXTERNAL_API_KEY`.

---

## 2. Authentification

Toutes les requêtes doivent inclure la clé API dans le header `x-api-key` :

```
POST /functions/v1/api-external
Content-Type: application/json
x-api-key: edb52633206761a242359346e4f367a91c59aee90a65689cfb3eda3b43949aa4
```

**Erreur 401** si la clé est absente ou invalide :
```json
{ "success": false, "error": "Clé API invalide ou manquante" }
```

---

## 3. Endpoints

Tous les endpoints utilisent la même URL. L'action est spécifiée dans le body JSON.

### 3.1 `get_types` — Lister les démarches disponibles

```json
// Request
{ "action": "get_types" }

// Response
{
  "success": true,
  "types": [
    {
      "code": "CG",
      "titre": "Carte Grise (Changement de titulaire)",
      "description": "Demande de nouvelle carte grise suite à un changement de propriétaire",
      "prix_base": 30,
      "actif": true,
      "ordre": 1
    },
    {
      "code": "DA",
      "titre": "Déclaration d'Achat",
      "description": "Déclaration d'achat d'un véhicule d'occasion",
      "prix_base": 19.90,
      "actif": true,
      "ordre": 2
    },
    {
      "code": "DC",
      "titre": "Déclaration de Cession",
      "description": "Déclaration de vente d'un véhicule",
      "prix_base": 19.90,
      "actif": true,
      "ordre": 3
    }
  ]
}
```

---

### 3.2 `create_order` — Créer une commande

```json
// Request
{
  "action": "create_order",
  "immatriculation": "AB-123-CD",    // OBLIGATOIRE - Plaque d'immat
  "demarche_type": "CG",             // OBLIGATOIRE - Code démarche (CG, DA, DC)
  "email": "client@email.com",       // OBLIGATOIRE - Email du client

  // Optionnels (peuvent être remplis plus tard par le client)
  "nom": "Dupont",
  "prenom": "Jean",
  "telephone": "0612345678",
  "adresse": "12 rue de la Paix",
  "code_postal": "75001",
  "ville": "Paris",
  "montant_ht": 150.00,              // Si non fourni, utilise prix_base du type
  "frais_dossier": 30,               // Défaut: 30€
  "source": "monautresite.fr"        // Pour tracker l'origine dans l'admin
}

// Response
{
  "success": true,
  "order_id": "a1b2c3d4-e5f6-...",
  "tracking_number": "TRK-2026-000123",
  "tracking_url": "https://discountcartegrise.fr/suivi/TRK-2026-000123",
  "payment_url": "https://discountcartegrise.fr/demarche-simple?orderId=a1b2c3d4&type=CG&plaque=AB-123-CD",
  "order": {
    "id": "a1b2c3d4-e5f6-...",
    "tracking_number": "TRK-2026-000123",
    "immatriculation": "AB-123-CD",
    "montant_ht": 150.00,
    "montant_ttc": 180.00,
    "frais_dossier": 30,
    "status": "en_attente",
    "created_at": "2026-04-05T10:00:00Z",
    "demarche_type": "CG",
    "email": "client@email.com"
  }
}
```

**Ce qui se passe automatiquement :**
- Un numéro de suivi TRK-XXXX-XXXXXX est généré
- Un email de confirmation est envoyé au client
- Un email de notification est envoyé à l'admin

---

### 3.3 `get_order` — Récupérer le statut d'une commande

```json
// Request (par tracking_number OU order_id)
{ "action": "get_order", "tracking_number": "TRK-2026-000123" }
// ou
{ "action": "get_order", "order_id": "a1b2c3d4-e5f6-..." }

// Response
{
  "success": true,
  "order": {
    "id": "a1b2c3d4-...",
    "tracking_number": "TRK-2026-000123",
    "status": "paye",
    "immatriculation": "AB-123-CD",
    "demarche_type": "CG",
    "email": "client@email.com",
    "nom": "Dupont",
    "prenom": "Jean",
    "telephone": "0612345678",
    "montant_ht": 150.00,
    "montant_ttc": 180.00,
    "frais_dossier": 30,
    "paye": true,
    "paid_at": "2026-04-05T10:05:00Z",
    "documents_complets": true,
    "created_at": "2026-04-05T10:00:00Z",
    "updated_at": "2026-04-05T10:05:00Z"
  },
  "documents": [
    {
      "id": "...",
      "type_document": "Carte grise (recto)",
      "nom_fichier": "carte_grise_recto.pdf",
      "validation_status": "approved",
      "rejection_reason": null,
      "side": "recto",
      "created_at": "2026-04-05T10:03:00Z"
    }
  ],
  "admin_documents": [
    {
      "id": "...",
      "nom_fichier": "carte_grise_finale.pdf",
      "description": "Votre nouvelle carte grise",
      "created_at": "2026-04-06T14:00:00Z"
    }
  ],
  "facture": {
    "id": "...",
    "numero_facture": "F-2026-000456",
    "montant_ht": 150.00,
    "montant_ttc": 180.00,
    "created_at": "2026-04-05T10:05:00Z"
  }
}
```

---

### 3.4 `create_payment_link` — Générer un lien de paiement

```json
// Request
{ "action": "create_payment_link", "tracking_number": "TRK-2026-000123" }
// ou
{ "action": "create_payment_link", "order_id": "a1b2c3d4-..." }

// Response (pas encore payé)
{
  "success": true,
  "already_paid": false,
  "payment_url": "https://discountcartegrise.fr/demarche-simple?orderId=...&type=CG&plaque=AB-123-CD",
  "tracking_url": "https://discountcartegrise.fr/suivi/TRK-2026-000123"
}

// Response (déjà payé)
{
  "success": true,
  "already_paid": true,
  "tracking_url": "https://discountcartegrise.fr/suivi/TRK-2026-000123"
}
```

---

## 4. Types de démarches

| Code | Titre | Prix de base | Infos véhicule | Taxe régionale |
|------|-------|-------------|----------------|----------------|
| `CG` | Carte Grise (Changement de titulaire) | 30€ (frais dossier) + taxe régionale | Oui (marque, modèle, énergie, puissance, date MEC) | Oui (varie par département) |
| `DA` | Déclaration d'Achat | 19.90€ | Oui (immatriculation) | Non |
| `DC` | Déclaration de Cession | 19.90€ | Oui (immatriculation) | Non |

### Détail par type

#### CG — Carte Grise
- **Usage** : Changement de propriétaire d'un véhicule
- **Prix** : Taxe régionale (calculée par département + puissance fiscale) + 30€ frais de dossier
- **Infos véhicule requises** : marque, modèle, énergie, puissance fiscale, date de mise en circulation
- **Documents** : Carte grise recto+verso, pièce d'identité recto+verso, justificatif de domicile

#### DA — Déclaration d'Achat
- **Usage** : Déclarer l'achat d'un véhicule d'occasion (professionnel)
- **Prix fixe** : 19.90€
- **Infos véhicule requises** : immatriculation uniquement
- **Documents** : Carte grise recto+verso, pièce d'identité recto+verso, justificatif de domicile

#### DC — Déclaration de Cession
- **Usage** : Déclarer la vente d'un véhicule
- **Prix fixe** : 19.90€
- **Infos véhicule requises** : immatriculation uniquement
- **Documents** : Carte grise recto+verso, pièce d'identité recto+verso, justificatif de domicile

---

## 5. Documents requis par démarche

### Documents par défaut (type CG)

| # | Document | Recto/Verso | Obligatoire |
|---|----------|-------------|-------------|
| 1 | Carte grise (recto) | Recto seul | Oui |
| 2 | Carte grise (verso) | Verso seul | Oui |
| 3 | Pièce d'identité (recto) | Recto seul | Oui |
| 4 | Pièce d'identité (verso) | Verso seul | Oui |
| 5 | Justificatif de domicile | Recto seul | Oui |

### Détection recto/verso automatique

Les documents suivants nécessitent RECTO + VERSO (détection automatique par mot-clé) :
- Pièce d'identité
- Carte d'identité
- Permis de conduire
- Permis du titulaire
- Permis du co-titulaire

Tous les autres documents sont recto uniquement.

### Formats acceptés
- PDF (`.pdf`)
- Images (`.jpg`, `.jpeg`, `.png`)

### Stockage
Les documents sont uploadés par le client sur la page de suivi après le paiement. Ils sont stockés dans Supabase Storage sous `guest-order-documents/{orderId}/`.

---

## 6. Questions conditionnelles

Après le paiement, le client remplit un formulaire avec des questions conditionnelles qui peuvent déclencher des champs supplémentaires :

| Question | Champ DB | Type | Si "Oui" |
|----------|----------|------|----------|
| "Y a-t-il un co-titulaire sur la carte grise ?" | `has_cotitulaire` | Boolean | Demande `cotitulaire_nom` + `cotitulaire_prenom` + pièce d'identité co-titulaire |
| "Le véhicule a-t-il été acheté chez un professionnel ?" | `vehicule_pro` | Boolean | Aucun champ supplémentaire (info pour le traitement) |
| "Le véhicule est-il en leasing/LLD/LOA ?" | `vehicule_leasing` | Boolean | Aucun champ supplémentaire |
| "Le titulaire est-il mineur ?" | `is_mineur` | Boolean | Aucun champ supplémentaire |
| "Le titulaire est-il hébergé ?" | `is_heberge` | Boolean | Demande attestation d'hébergement dans les docs |

### Champs du formulaire client complet

**Obligatoires :**
- `nom` — Nom de famille
- `prenom` — Prénom
- `email` — Adresse email
- `telephone` — Numéro de téléphone
- `adresse` — Adresse postale
- `code_postal` — Code postal
- `ville` — Ville

**Conditionnels (si co-titulaire) :**
- `cotitulaire_nom` — Nom du co-titulaire
- `cotitulaire_prenom` — Prénom du co-titulaire

---

## 7. Calcul des prix

### Formule

```
Total TTC = Prix carte grise (montant_ht) + Frais de dossier + SMS (optionnel)
```

**PAS DE TVA** — Le total est calculé sans TVA.

### Composants du prix

| Composant | Montant | Notes |
|-----------|---------|-------|
| Prix carte grise (`montant_ht`) | Variable (CG) ou fixe (DA/DC) | Pour CG : dépend du département + puissance fiscale |
| Frais de dossier (`frais_dossier`) | 30€ par défaut | Peut être modifié via l'API |
| Suivi SMS (`sms_notifications`) | +5€ | Optionnel, choix du client |
| Suivi email (`email_notifications`) | Gratuit | Activé par défaut |

### Pour les DA/DC (prix fixe)
```
Total = 19.90€ (prix_base inclut les frais de dossier)
```

### Pour les CG (prix variable)
```
Total = Taxe régionale (calculée) + 30€ (frais dossier) + 5€ (si SMS)
```

La taxe régionale est calculée automatiquement côté discountcartegrise.fr en fonction du département et de la puissance fiscale du véhicule.

---

## 8. Statuts de commande

| Statut | Description | Déclenché par |
|--------|-------------|---------------|
| `en_attente` | Commande créée, en attente de paiement | Création de la commande |
| `paye` | Paiement reçu | Paiement Stripe validé |
| `en_traitement` | Dossier en cours de traitement | Admin (tous les docs validés) |
| `valide` | Commande validée | Admin |
| `finalise` | Carte grise prête, envoyée au client | Admin (upload carte grise finale) |
| `refuse` | Commande refusée | Admin |

### Emails automatiques par statut

| Événement | Email client | Email admin |
|-----------|-------------|-------------|
| Commande créée | "Commande enregistrée" | "Nouvelle commande particulier" |
| Paiement reçu | "Paiement confirmé" + facture PDF | "Nouvelle demande à traiter" |
| Documents validés | "Documents validés" | — |
| Document refusé | "Documents à corriger" (avec motif) | — |
| Dossier en traitement | "Dossier en traitement" | — |
| Carte grise prête | "Votre carte grise est prête" | — |
| Message client | — | "Message client particulier" |
| Message admin | "Nouveau message" | — |
| Document re-uploadé | — | "Document re-envoyé" |

---

## 9. Flux complet d'intégration

### Scénario type : Le client veut une carte grise

```
TON SITE                                    DISCOUNTCARTEGRISE
────────                                    ──────────────────

1. Le client choisit sa démarche
   et entre sa plaque + email
         │
         ▼
2. Tu appelles create_order ────────────►  Commande créée en DB
   avec immatriculation, type, email        Tracking number généré
         │                                  Email confirmation envoyé
         ▼                                  Email admin envoyé
3. Tu reçois payment_url
         │
         ▼
4. Tu rediriges le client ─────────────►  Page de paiement
   vers payment_url                        (discountcartegrise.fr)
                                                  │
                                                  ▼
                                           5. Client entre email
                                              (pré-rempli si fourni)
                                                  │
                                                  ▼
                                           6. Client paie (Stripe)
                                                  │
                                                  ▼
                                           7. Client remplit ses infos
                                              (nom, prénom, adresse...)
                                                  │
                                                  ▼
                                           8. Client upload ses documents
                                              (carte grise, identité, domicile)
                                                  │
                                                  ▼
                                           9. Admin valide les documents
                                                  │
                                                  ▼
                                           10. Admin traite le dossier
                                                  │
                                                  ▼
                                           11. Admin envoie la carte grise
                                               finale au client par email

         │
         ▼ (optionnel)
12. Tu vérifies le statut ─────────────►  Retourne l'état actuel
    avec get_order                         de la commande
```

### Ce que tu dois coder sur ton site

1. **Page de choix démarche** : formulaire avec type de démarche + plaque + email
2. **Appel API `create_order`** : crée la commande
3. **Redirection** : envoie le client vers `payment_url`
4. **Page de confirmation (optionnel)** : affiche le tracking_number au retour

### Ce que DiscountCarteGrise gère automatiquement

- Paiement Stripe (carte bancaire, Google Pay, Apple Pay)
- Collecte des infos personnelles complètes
- Upload et validation des documents
- Communication par email à chaque étape
- Chat client ↔ admin
- Suivi de commande avec tracking number
- Facture PDF
- Envoi de la carte grise finale

---

## 10. Exemples de code

### JavaScript/TypeScript (Frontend ou Node.js)

```javascript
const API_URL = 'https://oiotlgkfwuwshpwraneb.supabase.co/functions/v1/api-external';
const API_KEY = 'edb52633206761a242359346e4f367a91c59aee90a65689cfb3eda3b43949aa4';

// Helper function
async function callAPI(body) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

// 1. Lister les démarches
const { types } = await callAPI({ action: 'get_types' });
console.log(types);
// → [{ code: "CG", titre: "Carte Grise", prix_base: 30 }, ...]

// 2. Créer une commande
const result = await callAPI({
  action: 'create_order',
  immatriculation: 'AB-123-CD',
  demarche_type: 'CG',
  email: 'jean.dupont@email.com',
  nom: 'Dupont',
  prenom: 'Jean',
  telephone: '0612345678',
  source: 'monautresite.fr',
});

console.log(result.tracking_number); // TRK-2026-000123
console.log(result.payment_url);     // URL vers discountcartegrise.fr

// 3. Rediriger le client vers le paiement
window.location.href = result.payment_url;

// 4. Vérifier le statut plus tard
const { order } = await callAPI({
  action: 'get_order',
  tracking_number: 'TRK-2026-000123',
});

console.log(order.status);   // "paye", "en_traitement", "finalise"...
console.log(order.paye);     // true/false
```

### Python

```python
import requests

API_URL = 'https://oiotlgkfwuwshpwraneb.supabase.co/functions/v1/api-external'
API_KEY = 'edb52633206761a242359346e4f367a91c59aee90a65689cfb3eda3b43949aa4'

headers = {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
}

# Lister les démarches
res = requests.post(API_URL, json={'action': 'get_types'}, headers=headers)
types = res.json()['types']

# Créer une commande
res = requests.post(API_URL, json={
    'action': 'create_order',
    'immatriculation': 'AB-123-CD',
    'demarche_type': 'CG',
    'email': 'client@email.com',
    'source': 'mon-site-python.fr',
}, headers=headers)

data = res.json()
print(f"Tracking: {data['tracking_number']}")
print(f"Paiement: {data['payment_url']}")
```

### cURL

```bash
# Lister les types
curl -X POST https://oiotlgkfwuwshpwraneb.supabase.co/functions/v1/api-external \
  -H "Content-Type: application/json" \
  -H "x-api-key: edb52633206761a242359346e4f367a91c59aee90a65689cfb3eda3b43949aa4" \
  -d '{"action":"get_types"}'

# Créer une commande
curl -X POST https://oiotlgkfwuwshpwraneb.supabase.co/functions/v1/api-external \
  -H "Content-Type: application/json" \
  -H "x-api-key: edb52633206761a242359346e4f367a91c59aee90a65689cfb3eda3b43949aa4" \
  -d '{"action":"create_order","immatriculation":"AB-123-CD","demarche_type":"CG","email":"test@email.com","source":"test-curl"}'

# Vérifier le statut
curl -X POST https://oiotlgkfwuwshpwraneb.supabase.co/functions/v1/api-external \
  -H "Content-Type: application/json" \
  -H "x-api-key: edb52633206761a242359346e4f367a91c59aee90a65689cfb3eda3b43949aa4" \
  -d '{"action":"get_order","tracking_number":"TRK-2026-000123"}'
```

---

## Erreurs courantes

| Code | Message | Cause |
|------|---------|-------|
| 401 | "Clé API invalide ou manquante" | Header `x-api-key` absent ou mauvais |
| 400 | "immatriculation est requis" | Champ obligatoire manquant |
| 400 | "email invalide" | Format email incorrect |
| 400 | "Action inconnue: xxx" | Action non reconnue |
| 404 | "Commande introuvable" | tracking_number ou order_id inexistant |
| 500 | "Erreur interne" | Erreur serveur (voir logs Supabase) |

---

## Notes importantes

1. **La clé API ne doit JAMAIS être exposée côté client** (navigateur). Utilisez-la uniquement côté serveur (backend Node.js, Python, PHP, etc.) ou dans des variables d'environnement.

2. **Le `payment_url` redirige vers discountcartegrise.fr** où le client effectue le paiement et le reste du processus (infos, documents). Tout est géré automatiquement.

3. **Le champ `source`** est stocké dans le commentaire admin de la commande. Il permet de savoir de quel site vient chaque commande.

4. **Les emails sont envoyés automatiquement** à chaque étape (confirmation, paiement, validation, etc.). Le client reçoit aussi un lien de suivi.

5. **Pour les CG** (carte grise), si vous ne fournissez pas `montant_ht`, le prix sera calculé automatiquement côté discountcartegrise.fr en fonction du département et de la puissance fiscale du véhicule.
