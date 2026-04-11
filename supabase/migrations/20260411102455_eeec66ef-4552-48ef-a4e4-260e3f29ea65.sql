
DROP POLICY IF EXISTS "Allow authenticated update guest_orders" ON public.guest_orders;
CREATE POLICY "Allow authenticated update guest_orders"
ON public.guest_orders FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated select guest_orders" ON public.guest_orders;
CREATE POLICY "Allow authenticated select guest_orders"
ON public.guest_orders FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow anon all guest_orders" ON public.guest_orders;
CREATE POLICY "Allow anon all guest_orders"
ON public.guest_orders FOR ALL
TO anon
USING (true)
WITH CHECK (true);
