-- Create pricing_config table to centralize all pricing settings
CREATE TABLE IF NOT EXISTS public.pricing_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;

-- Admins can manage pricing config
CREATE POLICY "Admins can manage pricing config"
ON public.pricing_config
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Everyone can view pricing config (needed for price calculation)
CREATE POLICY "Everyone can view pricing config"
ON public.pricing_config
FOR SELECT
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_pricing_config_updated_at
BEFORE UPDATE ON public.pricing_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default pricing values
INSERT INTO public.pricing_config (config_key, config_value, description) VALUES
  ('prix_par_cv', 42, 'Prix par cheval fiscal (en euros)'),
  ('taxe_co2_seuil', 200, 'Seuil de CO2 pour la taxe (en g/km)'),
  ('taxe_co2_montant', 20, 'Montant de la taxe CO2 par gramme au-dessus du seuil'),
  ('frais_acheminement', 2.76, 'Frais d''acheminement fixes'),
  ('taxe_gestion', 11, 'Taxe de gestion fixe'),
  ('frais_dossier', 30, 'Frais de dossier pour les commandes')
ON CONFLICT (config_key) DO NOTHING;