-- Remove unique constraint to allow multiple documents of same type per garage
ALTER TABLE public.verification_documents 
DROP CONSTRAINT IF EXISTS verification_documents_garage_id_document_type_key;