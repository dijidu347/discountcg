-- Create guest_orders table for orders without account
CREATE TABLE public.guest_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tracking_number TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Vehicle information
  immatriculation TEXT NOT NULL,
  marque TEXT,
  modele TEXT,
  date_mec TEXT,
  puiss_fisc INTEGER,
  energie TEXT,
  
  -- Client information
  email TEXT NOT NULL,
  telephone TEXT NOT NULL,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  adresse TEXT NOT NULL,
  code_postal TEXT NOT NULL,
  ville TEXT NOT NULL,
  
  -- Order details
  montant_ht NUMERIC(10,2) NOT NULL DEFAULT 0,
  montant_ttc NUMERIC(10,2) NOT NULL DEFAULT 0,
  frais_dossier NUMERIC(10,2) NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'en_attente',
  
  -- Payment
  paye BOOLEAN NOT NULL DEFAULT false,
  payment_intent_id TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  
  -- Tracking options
  sms_notifications BOOLEAN NOT NULL DEFAULT false,
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  
  -- Document completion
  documents_complets BOOLEAN NOT NULL DEFAULT false,
  
  -- Admin notes
  commentaire TEXT,
  validated_at TIMESTAMP WITH TIME ZONE,
  validated_by UUID,
  
  CONSTRAINT check_status CHECK (status IN ('en_attente', 'paye', 'en_traitement', 'valide', 'finalise', 'refuse'))
);

-- Create index on tracking_number for fast lookups
CREATE INDEX idx_guest_orders_tracking_number ON public.guest_orders(tracking_number);

-- Create index on email for customer lookups
CREATE INDEX idx_guest_orders_email ON public.guest_orders(email);

-- Enable RLS
ALTER TABLE public.guest_orders ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can create an order
CREATE POLICY "Anyone can create guest orders"
  ON public.guest_orders
  FOR INSERT
  WITH CHECK (true);

-- Policy: Anyone can view their order by tracking number (no auth needed)
CREATE POLICY "Anyone can view guest orders by tracking"
  ON public.guest_orders
  FOR SELECT
  USING (true);

-- Policy: Anyone can update their own order (for document upload)
CREATE POLICY "Anyone can update guest orders"
  ON public.guest_orders
  FOR UPDATE
  USING (true);

-- Policy: Admins can do everything (handled by service role)

-- Create guest_order_documents table for uploaded documents
CREATE TABLE public.guest_order_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL,
  type_document TEXT NOT NULL,
  nom_fichier TEXT NOT NULL,
  url TEXT NOT NULL,
  taille_octets INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_guest_order FOREIGN KEY (order_id) REFERENCES public.guest_orders(id) ON DELETE CASCADE
);

-- Create index on order_id for fast document lookups
CREATE INDEX idx_guest_order_documents_order_id ON public.guest_order_documents(order_id);

-- Enable RLS
ALTER TABLE public.guest_order_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert documents
CREATE POLICY "Anyone can upload documents"
  ON public.guest_order_documents
  FOR INSERT
  WITH CHECK (true);

-- Policy: Anyone can view documents
CREATE POLICY "Anyone can view documents"
  ON public.guest_order_documents
  FOR SELECT
  USING (true);

-- Function to generate unique tracking number
CREATE OR REPLACE FUNCTION public.generate_tracking_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
        SUBSTRING(tracking_number FROM LENGTH('TRK-' || year_prefix || '-') + 1)
        AS INTEGER
      )
    ),
    0
  ) + 1
  INTO next_number
  FROM guest_orders
  WHERE tracking_number LIKE 'TRK-' || year_prefix || '-%';
  
  new_numero := 'TRK-' || year_prefix || '-' || LPAD(next_number::TEXT, 6, '0');
  
  RETURN new_numero;
END;
$$;

-- Trigger to auto-generate tracking number
CREATE OR REPLACE FUNCTION public.set_tracking_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tracking_number IS NULL OR NEW.tracking_number = '' THEN
    NEW.tracking_number := public.generate_tracking_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_tracking_number
  BEFORE INSERT ON public.guest_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tracking_number();

-- Trigger for updated_at
CREATE TRIGGER trigger_guest_orders_updated_at
  BEFORE UPDATE ON public.guest_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();