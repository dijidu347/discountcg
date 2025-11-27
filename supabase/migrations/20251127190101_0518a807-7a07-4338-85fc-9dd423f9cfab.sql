-- Fix remaining admin_documents policies
DROP POLICY IF EXISTS "Admins can manage admin documents" ON public.guest_order_admin_documents;

CREATE POLICY "Admins can manage admin documents"
ON public.guest_order_admin_documents FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can view admin documents"
ON public.guest_order_admin_documents FOR SELECT
USING (true);

-- Make storage buckets private
UPDATE storage.buckets SET public = false WHERE name = 'demarche-documents';
UPDATE storage.buckets SET public = false WHERE name = 'guest-order-documents';
UPDATE storage.buckets SET public = false WHERE name = 'factures';

-- Storage policies for uploads
DROP POLICY IF EXISTS "Anyone can upload guest-order-documents" ON storage.objects;

CREATE POLICY "Anyone can upload guest-order-documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'guest-order-documents');