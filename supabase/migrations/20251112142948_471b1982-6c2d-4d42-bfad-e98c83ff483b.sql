-- Create factures table with auto-incrementing number
CREATE TABLE public.factures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT NOT NULL UNIQUE,
  demarche_id UUID NOT NULL REFERENCES public.demarches(id),
  garage_id UUID NOT NULL REFERENCES public.garages(id),
  montant_ht NUMERIC NOT NULL DEFAULT 0,
  montant_ttc NUMERIC NOT NULL DEFAULT 0,
  tva NUMERIC NOT NULL DEFAULT 20,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_factures_demarche_id ON public.factures(demarche_id);
CREATE INDEX idx_factures_garage_id ON public.factures(garage_id);
CREATE INDEX idx_factures_numero ON public.factures(numero);

-- Enable RLS
ALTER TABLE public.factures ENABLE ROW LEVEL SECURITY;

-- RLS Policies for factures
CREATE POLICY "Garages can view their own factures"
  ON public.factures
  FOR SELECT
  USING (garage_id IN (
    SELECT id FROM garages WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all factures"
  ON public.factures
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert factures"
  ON public.factures
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update factures"
  ON public.factures
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION public.generate_facture_numero()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  year_prefix TEXT;
  next_number INTEGER;
  new_numero TEXT;
BEGIN
  year_prefix := TO_CHAR(NOW(), 'YYYY');
  
  -- Get the highest number for current year
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(numero FROM POSITION('-' IN numero) + 1)
        AS INTEGER
      )
    ),
    0
  ) + 1
  INTO next_number
  FROM factures
  WHERE numero LIKE year_prefix || '-%';
  
  new_numero := year_prefix || '-' || LPAD(next_number::TEXT, 5, '0');
  
  RETURN new_numero;
END;
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_factures_updated_at
  BEFORE UPDATE ON public.factures
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add facture_id to demarches table
ALTER TABLE public.demarches
ADD COLUMN facture_id UUID REFERENCES public.factures(id);