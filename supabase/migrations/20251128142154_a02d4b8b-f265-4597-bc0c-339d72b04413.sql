-- Table pour les types de démarches particuliers avec leurs prix
CREATE TABLE public.guest_demarche_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  titre TEXT NOT NULL,
  description TEXT,
  prix_base NUMERIC NOT NULL DEFAULT 0,
  actif BOOLEAN NOT NULL DEFAULT true,
  ordre INTEGER NOT NULL DEFAULT 0,
  require_vehicle_info BOOLEAN NOT NULL DEFAULT true,
  require_carte_grise_price BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ajouter une colonne pour associer les documents à un type de démarche
ALTER TABLE public.guest_order_required_documents 
ADD COLUMN demarche_type_code TEXT DEFAULT NULL;

-- Enable RLS
ALTER TABLE public.guest_demarche_types ENABLE ROW LEVEL SECURITY;

-- Policies pour guest_demarche_types
CREATE POLICY "Everyone can view active demarche types"
ON public.guest_demarche_types
FOR SELECT
USING (actif = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage demarche types"
ON public.guest_demarche_types
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insérer les types de démarches par défaut
INSERT INTO public.guest_demarche_types (code, titre, description, prix_base, ordre, require_vehicle_info, require_carte_grise_price) VALUES
('CG', 'Carte Grise (Changement de titulaire)', 'Demande de nouvelle carte grise suite à un changement de propriétaire', 30, 1, true, true),
('DA', 'Déclaration d''Achat', 'Déclaration d''achat d''un véhicule d''occasion', 19.90, 2, true, false),
('DC', 'Déclaration de Cession', 'Déclaration de vente d''un véhicule', 19.90, 3, true, false);

-- Mettre à jour les documents existants pour les associer au type CG par défaut
UPDATE public.guest_order_required_documents 
SET demarche_type_code = 'CG' 
WHERE demarche_type_code IS NULL;

-- Trigger pour updated_at
CREATE TRIGGER update_guest_demarche_types_updated_at
BEFORE UPDATE ON public.guest_demarche_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();