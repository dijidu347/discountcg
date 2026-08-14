CREATE OR REPLACE FUNCTION public.reset_guest_order_admin_viewed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.guest_orders
  SET admin_viewed = false,
      updated_at = now()
  WHERE id = NEW.order_id
    AND paye = true;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reset_guest_order_admin_viewed() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reset_guest_order_admin_viewed() FROM anon;
GRANT EXECUTE ON FUNCTION public.reset_guest_order_admin_viewed() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_guest_order_admin_viewed() TO service_role;

CREATE TRIGGER trigger_reset_guest_order_admin_viewed
AFTER INSERT ON public.guest_order_documents
FOR EACH ROW
EXECUTE FUNCTION public.reset_guest_order_admin_viewed();