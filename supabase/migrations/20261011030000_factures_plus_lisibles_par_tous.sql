-- Les factures ne sont plus lisibles par tout le monde.
--
-- L'espace de stockage `factures` est marqué privé, mais quatre règles le
-- rouvraient en grand, pour le rôle `public` — c'est-à-dire tous les rôles,
-- `anon` compris :
--
--   « Factures are publicly accessible »  lecture, condition : bucket_id = 'factures'
--   « Public read factures »              la même, en double
--   « Service role can upload factures »  écriture, même condition
--   « Service role can update factures »  remplacement, même condition
--
-- Les deux dernières portent « service role » dans leur nom, mais le rôle de
-- service contourne les règles de ligne par construction : elles ne lui ont
-- jamais servi. Elles ne servaient qu'à l'inconnu.
--
-- Vérifié en ligne avant correction, avec la seule clé publique du site :
-- la liste de l'espace répond, et un PDF se télécharge (HTTP 200,
-- application/pdf). Les numéros sont séquentiels — 2026-00569 — donc toute
-- la facturation de l'année s'énumérait. Une facture porte la raison sociale,
-- le SIRET, l'adresse, le montant, l'immatriculation et le nom du client.
--
-- Rien ne s'appuie sur ces règles. Les trois chemins de lecture passent
-- ailleurs : le garage et l'admin par `get-signed-url`, qui vérifie que la
-- facture appartient bien au garage ; le client particulier par
-- `download-facture`, qui exige son numéro de suivi. Les deux fonctions
-- travaillent avec la clé de service et ne consultent donc pas ces règles.
--
-- Restent en place : l'admin lit, dépose et remplace ; le garage lit les
-- siennes, rangées sous son identifiant.

drop policy if exists "Factures are publicly accessible" on storage.objects;
drop policy if exists "Public read factures" on storage.objects;
drop policy if exists "Service role can upload factures" on storage.objects;
drop policy if exists "Service role can update factures" on storage.objects;
