-- Create table for managing required documents for individual customers (particuliers)
CREATE TABLE IF NOT EXISTS public.guest_order_required_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom_document TEXT NOT NULL,
  ordre INTEGER NOT NULL DEFAULT 0,
  obligatoire BOOLEAN NOT NULL DEFAULT true,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.guest_order_required_documents ENABLE ROW LEVEL SECURITY;

-- Admins can manage required documents
CREATE POLICY "Admins can manage required documents"
ON public.guest_order_required_documents
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Everyone can view active required documents
CREATE POLICY "Everyone can view active required documents"
ON public.guest_order_required_documents
FOR SELECT
USING (actif = true OR has_role(auth.uid(), 'admin'::app_role));

-- Insert default required documents for particuliers
INSERT INTO public.guest_order_required_documents (nom_document, ordre, obligatoire, actif) VALUES
('Carte grise (recto)', 1, true, true),
('Carte grise (verso)', 2, true, true),
('Pièce d''identité (recto)', 3, true, true),
('Pièce d''identité (verso)', 4, true, true),
('Justificatif de domicile', 5, true, true);

-- Add trigger for updated_at
CREATE TRIGGER update_guest_order_required_documents_updated_at
BEFORE UPDATE ON public.guest_order_required_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();