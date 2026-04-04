# API DiscountCarteGrise — Documentation Garages

## Sommaire
1. [Configuration](#1-configuration)
2. [Authentification](#2-authentification)
3. [Endpoints](#3-endpoints)
4. [Types de démarches](#4-types-de-démarches)
5. [Modes de paiement](#5-modes-de-paiement)
6. [Système de jetons](#6-système-de-jetons)
7. [Statuts de démarche](#7-statuts-de-démarche)
8. [Documents requis](#8-documents-requis)
9. [Flux complet d'intégration](#9-flux-complet-dintégration)
10. [Exemples de code](#10-exemples-de-code)

---

## 1. Configuration

### URL de l'API
```
https://oiotlgkfwuwshpwraneb.supabase.co/functions/v1/api-external
```

### Clé API
À configurer dans Supabase Dashboard → Edge Functions → Secrets :
```
EXTERNAL_API_KEY = <votre_clé>
```

---

## 2. Authentification

Header `x-api-key` obligatoire sur toutes les requêtes :
```
POST /functions/v1/api-external
Content-Type: application/json
x-api-key: VOTRE_CLE_API
```

---

## 3. Endpoints

| Action | Description |
|--------|-------------|
| `get_types` | Lister les types de démarches disponibles + prix |
| `get_garage` | Info d'un garage (solde jetons, statut vérification) |
| `create_demarche` | Créer une démarche pour un garage |
| `pay_with_tokens` | Payer une démarche avec le solde jetons |
| `get_demarche` | Récupérer le détail d'une démarche |
| `list_demarches` | Lister les démarches d'un garage |

---

### 3.1 `get_types` — Types de démarches disponibles

```json
// Request
{ "action": "get_types" }

// Response
{
  "success": true,
  "types": [
    {
      "id": "uuid",
      "type": "DA",
      "titre": "Déclaration d'achat",
      "description": "...",
      "prix": 5.00,
      "categorie": "rapide",
      "ordre": 1
    },
    {
      "type": "DC",
      "titre": "Déclaration de cession",
      "prix": 5.00
    },
    {
      "type": "CG",
      "titre": "Carte grise",
      "prix": 29.00
    }
    // ... autres types PRO
  ]
}
```

---

### 3.2 `get_garage` — Informations garage

```json
// Request
{ "action": "get_garage", "garage_id": "uuid-du-garage" }

// Response
{
  "success": true,
  "garage": {
    "id": "uuid",
    "raison_sociale": "Garage Dupont",
    "email": "garage@email.com",
    "telephone": "0612345678",
    "token_balance": 15,
    "free_token_available": true,
    "unlimited_free_tokens": false,
    "verified": true,
    "siret": "12345678901234",
    "ville": "Paris"
  }
}
```

---

### 3.3 `create_demarche` — Créer une démarche

```json
// Request
{
  "action": "create_demarche",
  "garage_id": "uuid-du-garage",        // OBLIGATOIRE
  "type": "CG",                          // OBLIGATOIRE (DA, DC, CG, etc.)
  "immatriculation": "AB-123-CD",        // OBLIGATOIRE

  // Optionnels
  "payment_mode": "pro_pays_all",        // Défaut: "pro_pays_all"
  "client_email": "client@email.com",    // OBLIGATOIRE si client_pays_all ou split
  "client_phone": "0612345678",          // Optionnel
  "commentaire": "Note interne",         // Optionnel
  "prix_carte_grise": 250.00             // Optionnel (taxe régionale pour CG)
}

// Response
{
  "success": true,
  "demarche_id": "uuid",
  "numero_demarche": "DEM-2026-000456",
  "demarche_url": "https://discountcartegrise.fr/demarche/uuid",
  "payment_url": "https://discountcartegrise.fr/paiement-demarche/uuid",
  "demarche": {
    "id": "uuid",
    "numero_demarche": "DEM-2026-000456",
    "type": "CG",
    "immatriculation": "AB-123-CD",
    "status": "en_saisie",
    "frais_dossier": 29.00,
    "prix_carte_grise": 250.00,
    "montant_ht": 29.00,
    "montant_ttc": 279.00,
    "is_free_token": false,
    "payment_mode": "pro_pays_all",
    "garage_id": "uuid",
    "created_at": "2026-04-05T10:00:00Z"
  }
}
```

**Selon le mode de paiement, l'URL retournée change :**
- `pro_pays_all` → `payment_url` (le garage paie tout)
- `client_pays_all` → `client_payment_url` (le client paie tout)
- `split` → `pro_payment_url` (le garage paie sa part, puis le client)

---

### 3.4 `pay_with_tokens` — Payer avec les jetons

```json
// Request
{
  "action": "pay_with_tokens",
  "garage_id": "uuid-du-garage",
  "demarche_id": "uuid-de-la-demarche"
}

// Response (succès)
{
  "success": true,
  "paid": true,
  "method": "tokens",           // ou "free_token" si jeton gratuit
  "tokens_used": 6,
  "tokens_remaining": 9
}

// Response (solde insuffisant)
{
  "success": false,
  "error": "Solde insuffisant. Requis: 6 jetons, Disponible: 3"
}
```

**Calcul jetons :** 1 jeton = 5€, arrondi au supérieur.
- Frais de dossier 29€ → 6 jetons
- Frais de dossier 5€ → 1 jeton

---

### 3.5 `get_demarche` — Détail d'une démarche

```json
// Request (par ID ou numéro)
{ "action": "get_demarche", "demarche_id": "uuid" }
// ou
{ "action": "get_demarche", "numero_demarche": "DEM-2026-000456" }
// + optionnel: "garage_id": "uuid" (pour filtrer)

// Response
{
  "success": true,
  "demarche": {
    "id": "uuid",
    "numero_demarche": "DEM-2026-000456",
    "garage_id": "uuid",
    "type": "CG",
    "status": "en_cours",
    "immatriculation": "AB-123-CD",
    "frais_dossier": 29.00,
    "prix_carte_grise": 250.00,
    "montant_ht": 29.00,
    "montant_ttc": 279.00,
    "paye": true,
    "paid_with_tokens": true,
    "is_free_token": false,
    "payment_mode": "pro_pays_all",
    "client_email": null,
    "client_paid": false,
    "documents_complets": true,
    "is_draft": false,
    "created_at": "...",
    "updated_at": "..."
  },
  "documents": [
    {
      "id": "uuid",
      "type_document": "carte_grise",
      "nom_fichier": "cg_recto.pdf",
      "validation_status": "approved",
      "validation_comment": null,
      "created_at": "..."
    }
  ],
  "facture": {
    "id": "uuid",
    "numero": "F-2026-000789",
    "montant_ht": 29.00,
    "montant_ttc": 279.00,
    "pdf_url": "https://...",
    "created_at": "..."
  }
}
```

---

### 3.6 `list_demarches` — Lister les démarches d'un garage

```json
// Request
{
  "action": "list_demarches",
  "garage_id": "uuid-du-garage",
  "status": "en_cours",          // Optionnel: filtrer par statut
  "limit": 20                    // Optionnel: défaut 50
}

// Response
{
  "success": true,
  "demarches": [
    {
      "id": "uuid",
      "numero_demarche": "DEM-2026-000456",
      "type": "CG",
      "immatriculation": "AB-123-CD",
      "status": "en_cours",
      "montant_ttc": 279.00,
      "paye": true,
      "is_free_token": false,
      "payment_mode": "pro_pays_all",
      "created_at": "..."
    }
  ],
  "count": 1
}
```

---

## 4. Types de démarches

### Démarches standard

| Type | Titre | Prix (frais dossier) | Jeton gratuit possible |
|------|-------|---------------------|----------------------|
| `DA` | Déclaration d'Achat | 5€ | Oui |
| `DC` | Déclaration de Cession | 5€ | Oui |
| `CG` | Carte Grise (changement titulaire) | 29€ | Non |

### Démarches PRO

| Type | Titre | Prix |
|------|-------|------|
| `WW_PROVISOIRE_PRO` | WW Provisoire | Variable |
| `W_GARAGE_PRO` | W Garage | Variable |
| `QUITUS_FISCAL_PRO` | Quitus Fiscal | Variable |
| `CHANGEMENT_ADRESSE_PRO` | Changement d'adresse | Variable |
| `DUPLICATA_CG_PRO` | Duplicata carte grise | Variable |
| `FIV_PRO` | Fiche d'Identification Véhicule | Variable |
| `CG_NEUF_PRO` | Carte grise véhicule neuf | Variable |
| `MODIF_CG_PRO` | Modification carte grise | Variable |
| `SUCCESSION_HERITAGE_PRO` | Succession/Héritage | Variable |
| `COTITULAIRE_PRO` | Ajout co-titulaire | Variable |
| `CYCLO_ANCIEN_PRO` | Immatriculation cyclomoteur ancien | Variable |

> Utilisez `get_types` pour avoir la liste à jour avec les prix actuels.

---

## 5. Modes de paiement

| Mode | Qui paie | Frais dossier | Carte grise | Requis |
|------|---------|---------------|-------------|--------|
| `pro_pays_all` | Le garage | Stripe 1 | Stripe 1 | Rien de spécial |
| `client_pays_all` | Le client | Stripe 2 | Stripe 2 | `client_email` |
| `split` | Les deux | Garage: Stripe 1 | Client: Stripe 2 | `client_email` |

### Paiement par jetons (alternative)
Au lieu de payer par Stripe, le garage peut utiliser ses jetons :
- Appeler `pay_with_tokens` après `create_demarche`
- 1 jeton = 5€ (arrondi supérieur)
- DA/DC avec jeton gratuit : 0 jeton

### Paiement par Stripe
- Rediriger le garage vers `payment_url` retourné par `create_demarche`
- Le garage paie sur discountcartegrise.fr
- La démarche passe automatiquement en `paye: true`

---

## 6. Système de jetons

| Propriété | Description |
|-----------|-------------|
| `token_balance` | Nombre de jetons disponibles |
| `free_token_available` | Le garage a un jeton gratuit (1ère DA/DC) |
| `unlimited_free_tokens` | Jetons gratuits illimités (offre spéciale) |

### Calcul du coût en jetons
```
Coût = ceil(frais_dossier / 5)

Exemples:
  DA (5€)  → 1 jeton
  DC (5€)  → 1 jeton
  CG (29€) → 6 jetons
```

### Jeton gratuit
- S'applique uniquement aux DA et DC
- Déduit automatiquement si `free_token_available = true`
- Si `unlimited_free_tokens = true` → jamais consommé

---

## 7. Statuts de démarche

| Statut | Description |
|--------|-------------|
| `en_saisie` | Brouillon, en cours de création |
| `en_attente_paiement` | En attente du paiement pro |
| `en_attente_paiement_client` | En attente du paiement client |
| `en_attente_documents` | En attente de documents |
| `en_attente_validation` | Soumise, en attente de validation admin |
| `en_cours` | En cours de traitement |
| `acceptee` | Acceptée / terminée |
| `rejetee` | Refusée par l'admin |

### Emails automatiques

| Événement | Email garage | Email admin |
|-----------|-------------|-------------|
| Démarche créée | Confirmation + facture | Nouvelle demande |
| Paiement reçu | Confirmation paiement | Paiement reçu |
| Documents validés | - | - |
| Carte grise prête | Document disponible | - |
| Démarche acceptée | Notification complétion | - |
| Message admin | Nouveau message | - |

---

## 8. Documents requis

### Par type de démarche

#### CG — Carte Grise
1. Carte grise originale (recto + verso)
2. Pièce d'identité du titulaire (recto + verso)
3. Justificatif de domicile (< 6 mois)
4. Cerfa de demande de certificat d'immatriculation
5. Si co-titulaire : pièce d'identité co-titulaire

#### DA — Déclaration d'Achat
1. Carte grise originale (recto + verso)
2. Pièce d'identité (recto + verso)

#### DC — Déclaration de Cession
1. Carte grise originale (recto + verso)
2. Pièce d'identité du vendeur (recto + verso)
3. Cerfa 15776 (déclaration de cession)

### Upload des documents
Les documents sont uploadés par le garage depuis discountcartegrise.fr après la création de la démarche, via la page `/demarche/{id}`.

---

## 9. Flux complet d'intégration

### Scénario 1 : DA/DC avec jeton gratuit

```
TON SITE                                    DISCOUNTCARTEGRISE
────────                                    ──────────────────

1. Garage choisit DA ou DC
   et entre la plaque
         │
         ▼
2. create_demarche ──────────────────────►  Démarche créée
   garage_id + type=DA + immat               (is_free_token: true)
         │
         ▼
3. pay_with_tokens ──────────────────────►  Paiement gratuit
   garage_id + demarche_id                   Jeton déduit
         │
         ▼
4. Rediriger le garage ──────────────────►  Page démarche
   vers demarche_url                        Upload documents
                                            Suivi en temps réel
```

### Scénario 2 : CG avec paiement Stripe (pro_pays_all)

```
TON SITE                                    DISCOUNTCARTEGRISE
────────                                    ──────────────────

1. Garage choisit CG
   entre la plaque + prix carte grise
         │
         ▼
2. create_demarche ──────────────────────►  Démarche créée
   garage_id + type=CG + immat              (montant_ttc calculé)
   + prix_carte_grise=250
         │
         ▼
3. Rediriger le garage ──────────────────►  Page paiement Stripe
   vers payment_url                          Garage paie 279€
                                                  │
                                                  ▼
                                            Upload documents
                                            Suivi en temps réel
                                            Facture PDF générée
```

### Scénario 3 : CG avec paiement client (client_pays_all)

```
TON SITE                                    DISCOUNTCARTEGRISE
────────                                    ──────────────────

1. Garage choisit CG
   + email client
         │
         ▼
2. create_demarche ──────────────────────►  Démarche créée
   type=CG + payment_mode=client_pays_all    Email envoyé au client
   + client_email=xxx                        avec lien de paiement
         │
         ▼
3. Rediriger le garage ──────────────────►  Page démarche (suivi)
   vers demarche_url
                                            Le client paie de son côté
                                            via le lien reçu par email
```

---

## 10. Exemples de code

### JavaScript/TypeScript

```javascript
const API_URL = 'https://oiotlgkfwuwshpwraneb.supabase.co/functions/v1/api-external';
const API_KEY = 'VOTRE_CLE_API';

async function callAPI(body) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
    body: JSON.stringify(body),
  });
  return res.json();
}

// 1. Voir les types de démarches
const { types } = await callAPI({ action: 'get_types' });

// 2. Vérifier le solde du garage
const { garage } = await callAPI({ action: 'get_garage', garage_id: 'UUID' });
console.log(`Jetons: ${garage.token_balance}, Gratuit: ${garage.free_token_available}`);

// 3. Créer une DA avec jeton gratuit
const result = await callAPI({
  action: 'create_demarche',
  garage_id: 'UUID',
  type: 'DA',
  immatriculation: 'AB-123-CD',
});

// 4. Payer avec jeton
const payment = await callAPI({
  action: 'pay_with_tokens',
  garage_id: 'UUID',
  demarche_id: result.demarche_id,
});
// → payment.method = "free_token"

// 5. Rediriger vers la page de la démarche
window.location.href = result.demarche_url;

// 6. Créer une CG avec paiement client
const cg = await callAPI({
  action: 'create_demarche',
  garage_id: 'UUID',
  type: 'CG',
  immatriculation: 'CD-456-EF',
  payment_mode: 'client_pays_all',
  client_email: 'client@email.com',
  prix_carte_grise: 250.00,
});
// → Le client reçoit un email avec le lien de paiement

// 7. Lister les démarches du garage
const { demarches } = await callAPI({
  action: 'list_demarches',
  garage_id: 'UUID',
  status: 'en_cours',
});

// 8. Vérifier une démarche
const { demarche } = await callAPI({
  action: 'get_demarche',
  demarche_id: 'UUID',
});
console.log(demarche.status); // "acceptee"
```

### cURL

```bash
# Lister les types
curl -X POST $API_URL \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{"action":"get_types"}'

# Info garage
curl -X POST $API_URL \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{"action":"get_garage","garage_id":"UUID"}'

# Créer une DA
curl -X POST $API_URL \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{"action":"create_demarche","garage_id":"UUID","type":"DA","immatriculation":"AB-123-CD"}'

# Payer avec jetons
curl -X POST $API_URL \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{"action":"pay_with_tokens","garage_id":"UUID","demarche_id":"UUID"}'
```

---

## Erreurs courantes

| Code | Message | Cause |
|------|---------|-------|
| 401 | Clé API invalide ou manquante | Header `x-api-key` absent ou incorrect |
| 400 | garage_id est requis | Champ obligatoire manquant |
| 400 | client_email est requis pour le mode... | Mode split/client sans email |
| 402 | Solde insuffisant | Pas assez de jetons |
| 403 | Cette démarche n'appartient pas à ce garage | garage_id ne matche pas |
| 404 | Garage/Démarche introuvable | ID inexistant |

---

## Notes importantes

1. **La clé API est côté serveur uniquement** — ne jamais l'exposer dans le navigateur
2. **Le `garage_id`** est l'UUID du garage dans Supabase. Le garage doit d'abord avoir un compte sur discountcartegrise.fr
3. **Les documents sont uploadés sur discountcartegrise.fr** — l'API crée la démarche, le garage upload ses docs via le site
4. **Le prix carte grise** pour les CG dépend du département et de la puissance fiscale. Si non fourni, il sera 0 et devra être complété sur le site
5. **Les factures sont générées automatiquement** après paiement (PDF disponible via `get_demarche`)
6. **Les emails sont envoyés automatiquement** à chaque étape (confirmation, paiement, validation)
