-- Add demarche_type column to guest_orders
ALTER TABLE public.guest_orders 
ADD COLUMN IF NOT EXISTS demarche_type text DEFAULT 'CG';

-- Add comment for documentation
COMMENT ON COLUMN public.guest_orders.demarche_type IS 'Type de démarche: CG (Carte Grise), DA (Déclaration d''Achat), DC (Déclaration de Cession)';