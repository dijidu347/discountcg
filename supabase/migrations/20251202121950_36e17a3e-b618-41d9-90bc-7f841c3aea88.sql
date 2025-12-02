-- Ajouter le solde de jetons aux garages
ALTER TABLE public.garages
ADD COLUMN token_balance integer NOT NULL DEFAULT 0;

-- Table pour l'historique des achats de jetons
CREATE TABLE public.token_purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  garage_id uuid NOT NULL REFERENCES public.garages(id) ON DELETE CASCADE,
  quantity integer NOT NULL,
  amount numeric NOT NULL,
  stripe_payment_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table pour la configuration des prix des packs de jetons
CREATE TABLE public.token_pricing (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quantity integer NOT NULL,
  price numeric NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  ordre integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Ajouter RLS pour token_purchases
ALTER TABLE public.token_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Garages can view their own token purchases"
ON public.token_purchases
FOR SELECT
USING (garage_id IN (
  SELECT id FROM garages WHERE user_id = auth.uid()
));

CREATE POLICY "Admins can view all token purchases"
ON public.token_purchases
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Ajouter RLS pour token_pricing
ALTER TABLE public.token_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active token pricing"
ON public.token_pricing
FOR SELECT
USING (active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage token pricing"
ON public.token_pricing
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger pour updated_at sur token_pricing
CREATE TRIGGER update_token_pricing_updated_at
BEFORE UPDATE ON public.token_pricing
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insérer des packs de jetons par défaut pour commencer
INSERT INTO public.token_pricing (quantity, price, description, ordre) VALUES
(10, 50, 'Pack Starter - 10 jetons', 1),
(50, 225, 'Pack Standard - 50 jetons', 2),
(100, 400, 'Pack Pro - 100 jetons', 3),
(500, 1750, 'Pack Enterprise - 500 jetons', 4);

-- Ajouter une colonne pour tracker si une démarche a été payée avec des jetons
ALTER TABLE public.demarches
ADD COLUMN paid_with_tokens boolean DEFAULT false;