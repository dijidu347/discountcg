# Coffre-fort Factures — Spec V1

## Contexte

Outil d'archivage de factures fournisseurs pour les professionnels de l'automobile (garages, marchands auto, agents, indépendants). Intégré comme option payante dans Discount Carte Grise.

**Positionnement** : coffre-fort documentaire simple, rapide, mobile-first. Pas un logiciel comptable.

## Modele commercial

- **Prix** : 9,99 EUR/mois
- **Essai** : 1 mois offert (Stripe trial_period_days: 30)
- **Engagement** : sans engagement, annulable a tout moment
- **Paiement** : Stripe Billing sur Stripe 1 (abonnement recurrent automatique)
- **Stockage** : illimite en V1 (limites possibles en V2)

## Architecture technique

**Approche** : Full Supabase (DB, Storage, Edge Functions, Auth existant)

### Base de donnees

#### Table `coffre_subscriptions`

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid PK | |
| garage_id | uuid FK -> garages, UNIQUE | Un seul abonnement par garage |
| stripe_subscription_id | text | ID abonnement Stripe |
| stripe_customer_id | text | ID client Stripe |
| status | text | `trialing`, `active`, `canceled`, `past_due` |
| cancel_at_period_end | boolean default false | Annulation programmee en fin de periode |
| trial_start | timestamptz | Debut essai gratuit |
| trial_end | timestamptz | Fin essai (trial_start + 30 jours) |
| current_period_start | timestamptz | |
| current_period_end | timestamptz | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### Table `coffre_documents`

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid PK | |
| garage_id | uuid FK -> garages | |
| category | text CHECK (category IN ('achats_vehicules','pieces_accessoires','carburant','entretien','transport','frais_divers')) | Categorie du document |
| title | text | Nom fournisseur ou titre libre |
| amount | numeric(10,2) | Montant en EUR (nullable) |
| document_date | date | Date du document |
| note | text | Note libre (nullable) |
| file_path | text | Chemin dans le bucket Supabase |
| file_name | text | Nom original du fichier |
| file_type | text | MIME type (`image/jpeg`, `application/pdf`, etc.) |
| file_size | bigint | Taille en octets (apres compression) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### Index et triggers

- Index `coffre_documents(garage_id, document_date DESC)` pour les requetes filtrées
- Index `coffre_documents(garage_id, created_at DESC)` pour la pagination
- Trigger `moddatetime` sur `updated_at` pour les deux tables

### Storage

- **Bucket** : `coffre-fort-documents` (prive)
- **Chemin** : `{garage_id}/{uuid}.{ext}` (le nom original est conserve dans `file_name` en base, pas dans le chemin Storage pour eviter les caracteres speciaux)

### RLS (Row-Level Security)

**Note** : `auth.uid()` correspond a `garages.id` dans ce projet (le garage est cree avec l'ID de l'utilisateur authentifie).

**Table `coffre_subscriptions`** :
- SELECT : garage ne voit que son propre abonnement (`garage_id = auth.uid()`)
- INSERT/UPDATE/DELETE : interdit cote client. Gere exclusivement par les Edge Functions via `service_role`
- Admin : acces complet via `has_role('admin')`

**Table `coffre_documents`** :
- SELECT : garage ne voit que ses propres documents (meme si abo expire — l'utilisateur garde l'acces en lecture)
- INSERT : garage avec abonnement actif uniquement. Policy avec sous-requete : `EXISTS (SELECT 1 FROM coffre_subscriptions WHERE garage_id = auth.uid() AND status IN ('trialing', 'active'))`. Note : fenetre de latence acceptable entre echec paiement et mise a jour webhook
- UPDATE : garage ne modifie que ses propres documents (autorise meme si abo expire — renommer, editer note)
- DELETE : garage ne supprime que ses propres documents (autorise meme si abo expire — l'utilisateur reste maitre de ses donnees)
- Admin : acces complet via `has_role('admin')`

**Bucket `coffre-fort-documents`** :
- INSERT : autorise si `auth.uid()` correspond au `garage_id` du chemin ET abonnement actif (sous-requete identique)
- SELECT : autorise si `auth.uid()` correspond au `garage_id` du chemin
- DELETE : autorise si `auth.uid()` correspond au `garage_id` du chemin
- Le chemin `{garage_id}/...` sert de cle de partitionnement pour le controle d'acces

### Edge Functions

| Fonction | Methode | Description |
|----------|---------|-------------|
| `create-coffre-subscription` | POST | Cree/recupere Stripe Customer, cree Subscription avec trial 30j, insere dans `coffre_subscriptions` |
| `webhook-stripe-coffre` | POST | Ecoute `customer.subscription.updated`, `.deleted`, `invoice.payment_failed`, `invoice.paid`. Met a jour `status` et `cancel_at_period_end` dans `coffre_subscriptions` |
| `export-coffre-documents` | POST | Recoit `{ ids: string[] }` ou `{ all: true }` ou `{ year: number }`. Genere ZIP en memoire (JSZip) via `service_role` pour acceder au Storage. Si taille totale > 100 Mo, retourne erreur 413 avec message "Veuillez selectionner moins de documents". Calcule la taille totale avant de commencer la generation. Contrainte Edge Function : ~150 Mo RAM, 2 min timeout |
| `get-coffre-signed-url` | POST | Genere signed URL temporaire (TTL: 300 secondes) pour visualiser un document prive |

**Securite webhook** : `webhook-stripe-coffre` verifie la signature Stripe (`stripe-signature` header + `STRIPE_WEBHOOK_SECRET`) pour empecher les events usurpes.

### Compression

- **Images (JPEG, PNG, HEIC)** : compression cote client avec `browser-image-compression`
  - Max 1920px de large
  - Qualite 60-70%
  - Conversion en JPEG
  - Gain typique : 5-8 Mo -> 200-400 Ko
- **PDF** : pas de compression (deja compresse)
- **HEIC** : conversion via `heic2any` polyfill (Chrome ne decode pas nativement HEIC) avant compression
- **Types acceptes** : `image/jpeg`, `image/png`, `image/heic`, `image/webp`, `application/pdf` uniquement
- **Taille max upload** : 20 Mo par fichier (avant compression)
- **Fichiers non supportes** : rejet avec toast d'erreur "Format non supporte. Utilisez une image ou un PDF."

## Ecrans et parcours UX

### 1. Widget Dashboard

**Non-abonne** : carte teaser avec fond bleu/dashed, badge "Nouveau", features list, CTA "Essayer 1 mois gratuit", mention "Puis 9,99 EUR/mois - Sans engagement"

**Abonne** : carte verte, stats (nb docs total + ce mois-ci), 3 derniers documents, boutons "Ajouter un document" + "Voir tous mes documents"

### 2. Navigation

- Nouvel onglet "Coffre-fort" dans la nav desktop et mobile (entre "Mes factures" et "Support")
- Non-abonnes : renvoie vers la page de vente
- Abonnes : renvoie vers la liste des documents

### 3. Page de vente (`/coffre-fort-sales`)

- Hero gradient bleu avec icone coffre-fort, prix 9,99 EUR/mois, badge "1er mois offert"
- CTA "Essayer gratuitement pendant 1 mois"
- Grille 6 features : Photo 2s, 6 categories, Cloud securise, Recherche, Export ZIP, Stockage illimite
- CTA bottom

### 4. Liste des documents (`/coffre-fort`)

- Header : titre + compteur + bouton "Ajouter un document"
- Barre export : Selectionner, Exporter la selection, Tout exporter (ZIP), Exporter par annee (select 2024/2025/2026)
- Filtres : categorie (select), date debut, date fin, recherche texte (fournisseur + note)
- Grille de cartes : miniature (couleur par categorie), titre, montant, date, badge categorie
- Mode selection : checkboxes sur les cartes, bouton export selection apparait
- FAB mobile : bouton + flottant en bas a droite
- Pagination : infinite scroll, 20 documents par page

### 5. Wizard ajout document (modale 4 etapes)

Barre de progression en haut (4 segments colores).

**Etape 1 — Upload** : 2 gros boutons "Prendre une photo" (camera native) + "Importer un fichier" (galerie/fichiers). Cliquer passe a l'etape 2.

**Etape 2 — Categorie** : apercu fichier compresse + 6 boutons categorie en grille 3x2. Cliquer une categorie passe automatiquement a l'etape 3.

**Etape 3 — Fournisseur + Date** : recap fichier + badge categorie. Champs fournisseur (texte libre) + date (pre-remplie a aujourd'hui). Bouton "Continuer".

**Etape 4 — Optionnel + Save** : recap complet (fichier + categorie + date). Champs montant (optionnel) + note (optionnel). Bouton "Enregistrer".

**Temps cible** : moins de 20 secondes pour le parcours complet.

**Gestion d'erreurs** : toast d'erreur en cas d'echec upload/compression/reseau. Bouton "Reessayer" sur l'etape 1. Si abonnement expire pendant l'upload, toast "Votre abonnement a expire" + redirection vers la page de vente.

### 6. Detail document

- Layout 2 colonnes desktop (preview + sidebar), 1 colonne mobile
- Preview : apercu image ou PDF
- Sidebar : infos (categorie, fournisseur, date, montant, note, fichier, date ajout)
- Actions : Telecharger, Renommer, Supprimer
- Bouton retour vers la liste

## Integration dans l'existant

### Fichiers a creer

- `src/pages/CoffreFort.tsx` — liste + wizard + detail (deja cree en demo)
- `src/pages/CoffreFortSales.tsx` — page de vente (deja cree en demo)
- `src/components/coffre-fort/CoffreWidget.tsx` — widget dashboard (extraire du Dashboard.tsx)
- `src/hooks/useCoffreSubscription.ts` — hook pour verifier le statut d'abonnement
- `src/hooks/useCoffreDocuments.ts` — hook CRUD documents
- `supabase/functions/create-coffre-subscription/index.ts`
- `supabase/functions/webhook-stripe-coffre/index.ts`
- `supabase/functions/export-coffre-documents/index.ts`
- `supabase/functions/get-coffre-signed-url/index.ts`
- Migration SQL pour les tables + bucket + RLS

### Fichiers a modifier

- `src/App.tsx` — ajouter routes `/coffre-fort` et `/coffre-fort-sales` (deja fait en demo)
- `src/pages/Dashboard.tsx` — ajouter widget coffre-fort + nav item (deja fait en demo)

## Ce que la V1 ne fait PAS

- OCR / extraction automatique
- Comptabilite / rapprochement bancaire
- Calcul TVA
- Synchronisation cabinet comptable
- Workflow de validation
- Tags personnalises
- Rangement automatique
- Relance pieces manquantes

## Evolutions futures (V2+)

L'architecture (tables, bucket, hooks) est concue pour accueillir :
- OCR automatique (extraction date/montant/fournisseur)
- Export comptable (CSV, format FEC)
- Acces comptable dedie (role + partage)
- Tags personnalises
- Limites de stockage par palier de prix
- Notifications et relances

## Wording commercial

- **Nom produit** : "Coffre-fort factures"
- **Tagline** : "Archivez vos factures fournisseurs en un clic"
- **Description courte** : "Simple, rapide, securise"
- **CTA principal** : "Essayer gratuitement pendant 1 mois"
- **Prix** : "9,99 EUR/mois - Sans engagement"
