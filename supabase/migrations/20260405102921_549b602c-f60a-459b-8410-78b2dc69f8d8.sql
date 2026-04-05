
-- Make factures bucket public
UPDATE storage.buckets SET public = true WHERE id = 'factures';

-- Policy: tout le monde peut lire les factures
CREATE POLICY "Public read factures" ON storage.objects
FOR SELECT USING (bucket_id = 'factures');

-- Policy: les edge functions (service role) peuvent uploader
CREATE POLICY "Service upload factures" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'factures');

-- Policy: les edge functions peuvent update
CREATE POLICY "Service update factures" ON storage.objects
FOR UPDATE USING (bucket_id = 'factures');
