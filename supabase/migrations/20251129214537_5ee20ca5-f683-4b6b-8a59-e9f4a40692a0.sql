-- Supprimer la contrainte unique sur le SIRET
ALTER TABLE public.garages DROP CONSTRAINT IF EXISTS garages_siret_key;