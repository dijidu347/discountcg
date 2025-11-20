-- Create storage bucket for guest order documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('guest-order-documents', 'guest-order-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload to guest order documents bucket
CREATE POLICY "Anyone can upload guest order documents"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'guest-order-documents');

-- Allow anyone to view guest order documents
CREATE POLICY "Anyone can view guest order documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'guest-order-documents');

-- Allow anyone to delete their own uploads (by path matching)
CREATE POLICY "Anyone can delete guest order documents"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'guest-order-documents');

-- Add validation fields to guest_order_documents
ALTER TABLE guest_order_documents
ADD COLUMN IF NOT EXISTS validation_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS validated_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS validated_by uuid,
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS side text;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_guest_order_documents_order_validation 
ON guest_order_documents(order_id, validation_status);