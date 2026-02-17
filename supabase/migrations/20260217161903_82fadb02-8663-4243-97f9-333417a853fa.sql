
-- Drop ALL existing INSERT policies on guest_orders
DROP POLICY IF EXISTS "Anyone can create guest orders" ON public.guest_orders;
DROP POLICY IF EXISTS "Admins can insert guest orders" ON public.guest_orders;

-- Recreate as PERMISSIVE (default) - this allows anon users to insert
CREATE POLICY "Anyone can create guest orders"
ON public.guest_orders
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
