-- Add column to track if a demarche used the free token
ALTER TABLE public.demarches ADD COLUMN IF NOT EXISTS is_free_token boolean DEFAULT false;