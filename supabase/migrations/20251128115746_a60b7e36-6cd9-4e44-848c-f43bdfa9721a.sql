-- Add free token column to garages table
ALTER TABLE public.garages 
ADD COLUMN IF NOT EXISTS free_token_available boolean DEFAULT true;

-- Set existing garages to false (only new accounts get the free token)
UPDATE public.garages SET free_token_available = false WHERE free_token_available IS NULL;