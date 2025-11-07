-- Add storage bucket for documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('demarche-documents', 'demarche-documents', false);

-- Create storage policies for demarche documents
CREATE POLICY "Garages can upload documents for their demarches"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'demarche-documents' AND
  auth.uid() IN (
    SELECT g.user_id 
    FROM garages g
    JOIN demarches d ON d.garage_id = g.id
    WHERE d.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Garages can view documents for their demarches"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'demarche-documents' AND
  (
    auth.uid() IN (
      SELECT g.user_id 
      FROM garages g
      JOIN demarches d ON d.garage_id = g.id
      WHERE d.id::text = (storage.foldername(name))[1]
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Admins can view all demarche documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'demarche-documents' AND
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can upload documents to demarches"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'demarche-documents' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Add columns to demarches table
ALTER TABLE demarches 
ADD COLUMN IF NOT EXISTS is_draft boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS documents_complets boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS paye boolean DEFAULT false;

-- Create notifications table for communication between admin and garages
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demarche_id uuid REFERENCES demarches(id) ON DELETE CASCADE,
  garage_id uuid REFERENCES garages(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'info', 'document_request', 'document_ready', 'payment_confirmed', 'review_request'
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Garages can view their own notifications"
ON notifications
FOR SELECT
USING (
  garage_id IN (
    SELECT id FROM garages WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all notifications"
ON notifications
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create notifications"
ON notifications
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Garages can mark their notifications as read"
ON notifications
FOR UPDATE
USING (
  garage_id IN (
    SELECT id FROM garages WHERE user_id = auth.uid()
  )
);

-- Update documents table to track document type
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS document_type text;

-- Create admin user with known credentials
-- Email: admin@autodocs.fr
-- Password: Admin123!
-- This will be created via the auth system