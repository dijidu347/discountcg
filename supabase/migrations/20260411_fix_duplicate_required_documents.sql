-- Fix: Remove duplicate rows from guest_order_required_documents
-- Root cause: No unique constraint on (nom_document, demarche_type_code)
-- This allowed admin pages to insert the same document type multiple times

-- Step 1: Delete duplicate rows, keeping only the one with the lowest id (oldest)
DELETE FROM public.guest_order_required_documents
WHERE id NOT IN (
  SELECT MIN(id)
  FROM public.guest_order_required_documents
  GROUP BY nom_document, demarche_type_code
);

-- Step 2: Add unique constraint to prevent future duplicates
ALTER TABLE public.guest_order_required_documents
ADD CONSTRAINT unique_document_per_demarche_type
UNIQUE (nom_document, demarche_type_code);
