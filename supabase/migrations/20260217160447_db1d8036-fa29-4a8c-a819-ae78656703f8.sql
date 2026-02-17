
-- Drop the ALL restrictive admin policy that blocks anonymous inserts
DROP POLICY IF EXISTS "Admins can manage all guest orders" ON public.guest_orders;

-- Recreate admin policies for specific commands (excluding INSERT which is handled by the permissive policy)
CREATE POLICY "Admins can select all guest orders"
ON public.guest_orders
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all guest orders"
ON public.guest_orders
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete all guest orders"
ON public.guest_orders
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert guest orders"
ON public.guest_orders
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
