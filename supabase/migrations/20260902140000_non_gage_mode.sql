-- Certificat de non-gage sur les démarches CG / DA / DC.
--
-- La pièce devient obligatoire. Deux façons de l'obtenir, tracées par
-- `non_gage_mode` :
--   'fourni'  -> le client dépose lui-même le certificat (gratuit, bloquant)
--   'facture' -> nous le commandons pour lui (2 EUR pro, 10 EUR particulier)
--
-- NULL = choix pas encore fait, ou démarche d'un type non concerné.

ALTER TABLE public.demarches
  ADD COLUMN IF NOT EXISTS non_gage_mode text;

ALTER TABLE public.demarches
  DROP CONSTRAINT IF EXISTS demarches_non_gage_mode_check;
ALTER TABLE public.demarches
  ADD CONSTRAINT demarches_non_gage_mode_check
  CHECK (non_gage_mode IS NULL OR non_gage_mode IN ('fourni', 'facture'));

ALTER TABLE public.guest_orders
  ADD COLUMN IF NOT EXISTS non_gage_mode text;

ALTER TABLE public.guest_orders
  DROP CONSTRAINT IF EXISTS guest_orders_non_gage_mode_check;
ALTER TABLE public.guest_orders
  ADD CONSTRAINT guest_orders_non_gage_mode_check
  CHECK (non_gage_mode IS NULL OR non_gage_mode IN ('fourni', 'facture'));

-- Les commandes particulier déjà passées avec l'option payante à 10 EUR sont
-- rétroactivement en mode 'facture' : le certificat a bien été commandé pour
-- le client. Les autres restent à NULL (l'option n'existait pas encore, aucune
-- pièce ne leur sera réclamée a posteriori).
UPDATE public.guest_orders
   SET non_gage_mode = 'facture'
 WHERE certificat_non_gage IS TRUE
   AND non_gage_mode IS NULL;

-- Le surcoût non-gage du parcours pro est porté par une ligne `tracking_services`.
-- Le garage pouvait déjà en créer une, mais pas la modifier ni la supprimer : sans
-- ces deux politiques, changer d'avis sur le certificat échouerait silencieusement
-- (RLS refuse l'UPDATE de l'upsert et le DELETE).
DROP POLICY IF EXISTS "Garages can update tracking services for their demarches" ON public.tracking_services;
CREATE POLICY "Garages can update tracking services for their demarches"
ON public.tracking_services FOR UPDATE
USING (demarche_id IN (
  SELECT d.id FROM demarches d
  JOIN garages g ON d.garage_id = g.id
  WHERE g.user_id = auth.uid()
))
WITH CHECK (demarche_id IN (
  SELECT d.id FROM demarches d
  JOIN garages g ON d.garage_id = g.id
  WHERE g.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Garages can delete tracking services for their demarches" ON public.tracking_services;
CREATE POLICY "Garages can delete tracking services for their demarches"
ON public.tracking_services FOR DELETE
USING (demarche_id IN (
  SELECT d.id FROM demarches d
  JOIN garages g ON d.garage_id = g.id
  WHERE g.user_id = auth.uid()
));
