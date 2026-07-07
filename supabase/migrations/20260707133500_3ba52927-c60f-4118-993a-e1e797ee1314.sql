CREATE POLICY "Owners can view their guest order documents"
ON public.guest_order_documents
FOR SELECT
TO authenticated
USING (
  order_id IN (SELECT id FROM public.guest_orders WHERE user_id = auth.uid())
);