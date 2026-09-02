-- Mandat Cerfa 13757 pré-rempli.
--
-- Objectif : générer le mandat automatiquement au lieu de faire imprimer, signer
-- et scanner un PDF vierge à chaque démarche. Trois briques :
--   1. un endroit où stocker signature et tampon, réutilisés d'une démarche à l'autre ;
--   2. de quoi savoir QUI est le mandant (le garage ou son client) ;
--   3. un instantané des données vérifiées par le client avant génération.

-- ---------------------------------------------------------------------------
-- 1. Stockage des signatures et tampons
-- ---------------------------------------------------------------------------
-- Bucket PRIVÉ : une signature manuscrite n'a rien à faire dans un bucket
-- public, contrairement aux pièces de dossier déjà stockées ailleurs.
INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', false)
ON CONFLICT (id) DO NOTHING;

-- Arborescence :
--   <garage_id>/signature.png   et  <garage_id>/tampon.png   -> professionnels
--   user/<user_id>/signature.png                             -> particuliers connectés
--   guest/<order_id>/signature.png                           -> invités sans compte

-- Professionnels : même cloisonnement que le coffre-fort (get_user_garage_id).
DROP POLICY IF EXISTS "signatures_garage_select" ON storage.objects;
CREATE POLICY "signatures_garage_select" ON storage.objects FOR SELECT
USING (bucket_id = 'signatures' AND (storage.foldername(name))[1] = (get_user_garage_id())::text);

DROP POLICY IF EXISTS "signatures_garage_insert" ON storage.objects;
CREATE POLICY "signatures_garage_insert" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'signatures' AND (storage.foldername(name))[1] = (get_user_garage_id())::text);

DROP POLICY IF EXISTS "signatures_garage_update" ON storage.objects;
CREATE POLICY "signatures_garage_update" ON storage.objects FOR UPDATE
USING (bucket_id = 'signatures' AND (storage.foldername(name))[1] = (get_user_garage_id())::text);

DROP POLICY IF EXISTS "signatures_garage_delete" ON storage.objects;
CREATE POLICY "signatures_garage_delete" ON storage.objects FOR DELETE
USING (bucket_id = 'signatures' AND (storage.foldername(name))[1] = (get_user_garage_id())::text);

-- Particuliers connectés : cloisonnés par user_id sous le préfixe "user/".
DROP POLICY IF EXISTS "signatures_user_all" ON storage.objects;
CREATE POLICY "signatures_user_all" ON storage.objects FOR ALL
USING (
  bucket_id = 'signatures'
  AND (storage.foldername(name))[1] = 'user'
  AND (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'signatures'
  AND (storage.foldername(name))[1] = 'user'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Invités sans compte : dépôt autorisé sous "guest/", mais AUCUNE lecture.
-- Un anonyme peut déposer sa propre signature, il ne peut pas lire celle des
-- autres. Seul le service_role (edge function de génération) la relit.
DROP POLICY IF EXISTS "signatures_guest_insert" ON storage.objects;
CREATE POLICY "signatures_guest_insert" ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'signatures' AND (storage.foldername(name))[1] = 'guest');

-- ---------------------------------------------------------------------------
-- 2. Chemins mémorisés
-- ---------------------------------------------------------------------------
ALTER TABLE public.garages
  ADD COLUMN IF NOT EXISTS signature_path text,
  ADD COLUMN IF NOT EXISTS tampon_path text;

ALTER TABLE public.particulier_profiles
  ADD COLUMN IF NOT EXISTS signature_path text;

ALTER TABLE public.guest_orders
  ADD COLUMN IF NOT EXISTS signature_path text;

-- ---------------------------------------------------------------------------
-- 3. Qui est le mandant, et données vérifiées
-- ---------------------------------------------------------------------------
-- Sur une démarche pro, le mandant est soit le garage lui-même (véhicule en
-- stock : son identité, sa signature ET son tampon), soit son client final
-- (identité du client, et c'est lui qui signe — jamais le garage à sa place).
ALTER TABLE public.demarches
  ADD COLUMN IF NOT EXISTS mandant_type text;

ALTER TABLE public.demarches
  DROP CONSTRAINT IF EXISTS demarches_mandant_type_check;
ALTER TABLE public.demarches
  ADD CONSTRAINT demarches_mandant_type_check
  CHECK (mandant_type IS NULL OR mandant_type IN ('garage', 'client'));

-- Instantané des valeurs relues et corrigées par le client juste avant la
-- génération : identité, adresse découpée (n° / extension / type de voie / nom
-- de voie, comme l'exige le Cerfa), VIN, nature de l'opération. Stocké en jsonb
-- plutôt qu'en colonnes pour ne pas figer un découpage qui pourra évoluer.
ALTER TABLE public.demarches
  ADD COLUMN IF NOT EXISTS mandat_data jsonb;

ALTER TABLE public.guest_orders
  ADD COLUMN IF NOT EXISTS mandat_data jsonb;

-- Le VIN n'est pas renvoyé par l'API plaque (vérifié : 0 sur 383 véhicules en
-- cache). Il est saisi une fois par le client — champ E de la carte grise — et
-- conservé pour les démarches suivantes sur le même dossier.
ALTER TABLE public.guest_orders
  ADD COLUMN IF NOT EXISTS vin text;
