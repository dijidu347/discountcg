-- Create storage bucket for invoices
INSERT INTO storage.buckets (id, name, public)
VALUES ('factures', 'factures', false);

-- Storage policies for factures bucket
CREATE POLICY "Admins can upload factures"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'factures' AND
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can update factures"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'factures' AND
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can view all factures"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'factures' AND
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Garages can view their own factures"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'factures' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM garages WHERE user_id = auth.uid()
    )
  );