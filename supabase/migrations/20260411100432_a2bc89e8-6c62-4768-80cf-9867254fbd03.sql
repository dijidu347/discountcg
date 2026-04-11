
-- Allow anonymous users to update guest orders (needed for saving customer info before payment)
CREATE POLICY "Allow anon update guest_orders"
ON public.guest_orders FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Also allow anonymous users to read guest order messages (for tracking page chat)
CREATE POLICY "Anon can view guest order messages by order"
ON public.guest_order_messages FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to insert guest order messages (for tracking page chat)
CREATE POLICY "Anon can insert guest order messages"
ON public.guest_order_messages FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anon to view their uploaded documents
CREATE POLICY "Anon can view guest order documents"
ON public.guest_order_documents FOR SELECT
TO anon
USING (true);
