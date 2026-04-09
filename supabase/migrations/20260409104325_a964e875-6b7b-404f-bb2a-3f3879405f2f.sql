
-- BUG #8 FIX: Add trigger to generate tracking_number for guest_orders on INSERT
CREATE OR REPLACE FUNCTION public.generate_guest_order_tracking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tracking_number IS NULL OR NEW.tracking_number = '' THEN
    NEW.tracking_number := public.generate_tracking_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guest_orders_generate_tracking ON public.guest_orders;

CREATE TRIGGER guest_orders_generate_tracking
BEFORE INSERT ON public.guest_orders
FOR EACH ROW
EXECUTE FUNCTION public.generate_guest_order_tracking();
