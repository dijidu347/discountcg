-- Make demarche-documents bucket private for security
UPDATE storage.buckets SET public = false WHERE id = 'demarche-documents';