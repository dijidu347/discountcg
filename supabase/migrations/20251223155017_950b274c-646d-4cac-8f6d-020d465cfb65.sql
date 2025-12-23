-- Fix RLS policy for guest_order_documents - restrict to admins only
DROP POLICY IF EXISTS "Anyone can view documents" ON guest_order_documents;

CREATE POLICY "Admins can view all guest order documents"
ON guest_order_documents
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));