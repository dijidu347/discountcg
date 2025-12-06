-- Create garage_verification_notifications table for notification history
CREATE TABLE public.garage_verification_notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    garage_id UUID NOT NULL REFERENCES public.garages(id) ON DELETE CASCADE,
    sent_by UUID REFERENCES auth.users(id),
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create garage_verification_required_documents for configurable required documents
CREATE TABLE public.garage_verification_required_documents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nom_document TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    obligatoire BOOLEAN NOT NULL DEFAULT true,
    ordre INTEGER NOT NULL DEFAULT 0,
    actif BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add admin_viewed column to garages for notification system
ALTER TABLE public.garages 
ADD COLUMN IF NOT EXISTS verification_admin_viewed BOOLEAN DEFAULT true;

-- Enable RLS
ALTER TABLE public.garage_verification_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garage_verification_required_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for garage_verification_notifications
CREATE POLICY "Admins can manage all notifications" 
ON public.garage_verification_notifications 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Garages can view their own notifications" 
ON public.garage_verification_notifications 
FOR SELECT 
USING (garage_id IN (SELECT id FROM garages WHERE user_id = auth.uid()));

-- RLS policies for garage_verification_required_documents
CREATE POLICY "Admins can manage required documents" 
ON public.garage_verification_required_documents 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can view active required documents" 
ON public.garage_verification_required_documents 
FOR SELECT 
USING (actif = true OR has_role(auth.uid(), 'admin'));

-- Insert default required documents
INSERT INTO public.garage_verification_required_documents (code, nom_document, description, obligatoire, ordre) VALUES
('kbis', 'KBIS', 'Extrait K-Bis de moins de 3 mois', true, 1),
('carte_identite', 'Carte d''identité', 'Recto/Verso de la carte d''identité du représentant légal', true, 2),
('mandat', 'Mandat pré-rempli', 'CERFA 13757 rempli et signé', true, 3);

-- Add trigger for updated_at
CREATE TRIGGER update_garage_verification_required_documents_updated_at
    BEFORE UPDATE ON public.garage_verification_required_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();