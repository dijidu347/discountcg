-- Make the demarche-documents bucket public
UPDATE storage.buckets SET public = true WHERE id = 'demarche-documents';