-- Fix: remove subscription-check from coffre_documents INSERT/UPDATE RLS
-- The subscription check is already enforced at the application layer (isActive redirect).
-- Keeping it in RLS breaks beta users and token-paid users who may not have a stripe row.

-- coffre_documents INSERT: just verify garage ownership
DROP POLICY IF EXISTS "coffre_doc_insert_active" ON coffre_documents;
CREATE POLICY "coffre_doc_insert_own" ON coffre_documents
  FOR INSERT WITH CHECK (garage_id = get_user_garage_id());

-- coffre_documents UPDATE: same
DROP POLICY IF EXISTS "coffre_doc_update_own" ON coffre_documents;
CREATE POLICY "coffre_doc_update_own" ON coffre_documents
  FOR UPDATE USING (garage_id = get_user_garage_id())
  WITH CHECK (garage_id = get_user_garage_id());

-- Storage INSERT: remove subscription check (app layer enforces it)
DROP POLICY IF EXISTS "coffre_storage_insert" ON storage.objects;
CREATE POLICY "coffre_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'coffre-fort-documents'
    AND (storage.foldername(name))[1] = get_user_garage_id()::text
  );

-- Also allow UPDATE on storage (needed for upsert)
DROP POLICY IF EXISTS "coffre_storage_update" ON storage.objects;
CREATE POLICY "coffre_storage_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'coffre-fort-documents'
    AND (storage.foldername(name))[1] = get_user_garage_id()::text
  );
