-- Frais bancaires sur les commandes particulier.
--
-- Meme principe que pour les paiements pro (migration 20260911160000) : la
-- commission est enregistree sur chaque nouvelle commande payee, exacte pour
-- Stripe, estimee pour Sogecommerce a partir de la carte utilisee et de la
-- grille rangee dans pricing_config. Les commandes anterieures n'ont aucune
-- information de carte : leurs frais restent vides.

ALTER TABLE public.guest_orders
  ADD COLUMN IF NOT EXISTS frais_bancaires numeric(10,2),
  ADD COLUMN IF NOT EXISTS frais_origine text,
  ADD COLUMN IF NOT EXISTS carte_categorie text,
  ADD COLUMN IF NOT EXISTS carte_marque text,
  ADD COLUMN IF NOT EXISTS carte_pays text,
  ADD COLUMN IF NOT EXISTS carte_produit text;
