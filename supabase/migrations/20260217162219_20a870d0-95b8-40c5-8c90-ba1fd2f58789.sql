
-- Add a SELECT policy for anon users so PostgREST can return inserted rows
-- This allows anyone to view guest orders by tracking_number (needed for order tracking feature too)
CREATE POLICY "Anyone can view guest orders by tracking"
ON public.guest_orders
FOR SELECT
TO anon, authenticated
USING (true);
