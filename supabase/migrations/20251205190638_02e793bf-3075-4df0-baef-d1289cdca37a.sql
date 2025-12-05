-- Drop overly permissive RLS policies on guest_orders
DROP POLICY IF EXISTS "Anyone can view guest orders by tracking" ON public.guest_orders;
DROP POLICY IF EXISTS "Anyone can update guest orders" ON public.guest_orders;

-- Keep the INSERT policy for order creation (public checkout)
-- "Anyone can create guest orders" already exists

-- Create policy for admins to manage all guest orders
CREATE POLICY "Admins can manage all guest orders" ON public.guest_orders
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create restrictive UPDATE policy - only admins can update orders
-- This prevents public modification of orders
CREATE POLICY "Only admins can update guest orders" ON public.guest_orders
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));