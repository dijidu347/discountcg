-- Frais bancaires par paiement (commissions monetiques).
--
-- Stripe : montant exact, lu sur la transaction de solde du paiement.
-- Sogecommerce : estime a partir de la carte utilisee (pays d'emission, code
-- produit) et de la grille contractuelle ci-dessous. Les champs bruts de la
-- carte sont conserves pour pouvoir reclasser un paiement si la grille ou les
-- regles de classement evoluent.
--
-- Les paiements anterieurs a cette migration n'ont aucune information de carte :
-- leurs frais restent vides, et les statistiques l'indiquent.

ALTER TABLE public.paiements
  ADD COLUMN IF NOT EXISTS frais_bancaires numeric(10,2),
  ADD COLUMN IF NOT EXISTS frais_origine text,
  ADD COLUMN IF NOT EXISTS carte_categorie text,
  ADD COLUMN IF NOT EXISTS carte_marque text,
  ADD COLUMN IF NOT EXISTS carte_pays text,
  ADD COLUMN IF NOT EXISTS carte_produit text;

ALTER TABLE public.token_purchases
  ADD COLUMN IF NOT EXISTS frais_bancaires numeric(10,2),
  ADD COLUMN IF NOT EXISTS frais_origine text,
  ADD COLUMN IF NOT EXISTS carte_categorie text,
  ADD COLUMN IF NOT EXISTS carte_marque text,
  ADD COLUMN IF NOT EXISTS carte_pays text,
  ADD COLUMN IF NOT EXISTS carte_produit text;

-- Grille Sogecommerce en vigueur (conditions communiquees le 3 septembre 2026).
-- A mettre a jour si la nouvelle grille (1,7556 % / 2,80 %) est confirmee.
INSERT INTO public.pricing_config (config_key, config_value, description) VALUES
  ('frais_soge_reguliere',   0.45,   'Commission Sogecommerce (%) - cartes prepayees/debit/credit a interchange regule, zone UE'),
  ('frais_soge_commerciale', 1.9979, 'Commission Sogecommerce (%) - cartes commerciales zone UE (1,7556 si la nouvelle grille est confirmee)'),
  ('frais_soge_hors_ue',     2.932,  'Commission Sogecommerce (%) - cartes hors zone UE (2,80 si la nouvelle grille est confirmee)'),
  ('frais_soge_inconnue',    1.20,   'Commission Sogecommerce (%) - categorie de carte non determinee (taux reel moyen de juillet 2026)')
ON CONFLICT (config_key) DO NOTHING;
