-- Add optional reseau column to garages table
ALTER TABLE public.garages ADD COLUMN IF NOT EXISTS reseau text;