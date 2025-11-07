-- Add validation columns to documents table
ALTER TABLE public.documents 
ADD COLUMN validation_status text DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'invalid')),
ADD COLUMN validation_comment text,
ADD COLUMN validated_at timestamp with time zone,
ADD COLUMN validated_by uuid REFERENCES auth.users(id);

-- Create index for faster queries
CREATE INDEX idx_documents_validation_status ON public.documents(validation_status);

COMMENT ON COLUMN public.documents.validation_status IS 'Status de validation du document: pending, valid, invalid';
COMMENT ON COLUMN public.documents.validation_comment IS 'Commentaire de l''admin si le document est invalide';