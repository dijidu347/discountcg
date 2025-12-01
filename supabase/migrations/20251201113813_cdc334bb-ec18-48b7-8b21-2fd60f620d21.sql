-- Add column to track if admin has viewed/processed the demarche
ALTER TABLE public.demarches ADD COLUMN IF NOT EXISTS admin_viewed boolean DEFAULT false;

-- Set existing paid/free token demarches as viewed (to not flood with notifications)
UPDATE public.demarches SET admin_viewed = true WHERE paye = true OR is_free_token = true;