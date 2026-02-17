
-- Drop the restrictive INSERT policy and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Anyone can create guest orders" ON public.guest_orders;

CREATE POLICY "Anyone can create guest orders"
ON public.guest_orders
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
