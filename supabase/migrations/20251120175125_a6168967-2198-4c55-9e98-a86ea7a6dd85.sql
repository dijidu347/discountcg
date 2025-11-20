-- Add required field to action_documents
ALTER TABLE public.action_documents ADD COLUMN obligatoire boolean NOT NULL DEFAULT true;