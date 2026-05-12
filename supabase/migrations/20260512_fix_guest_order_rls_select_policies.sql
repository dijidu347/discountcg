-- Fix: Remove overly permissive USING(true) anon SELECT policies on
-- guest_order_documents and guest_order_messages.
-- Replace with SECURITY DEFINER RPC functions that validate tracking_number
-- before returning data, so anonymous users can only access documents/messages
-- for orders they can prove they have access to.

-- 1. Drop the wide-open anon SELECT policies (added in 20260411100432)
DROP POLICY IF EXISTS "Anon can view guest order documents" ON guest_order_documents;
DROP POLICY IF EXISTS "Anon can view guest order messages by order" ON guest_order_messages;

-- 2. RPC: get documents for a specific order, validated by tracking_number
CREATE OR REPLACE FUNCTION public.get_guest_documents_by_tracking(
  p_tracking_number TEXT,
  p_order_id UUID
)
RETURNS SETOF guest_order_documents
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM guest_orders
    WHERE id = p_order_id
    AND tracking_number = p_tracking_number
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT * FROM guest_order_documents
  WHERE order_id = p_order_id;
END;
$$;

-- 3. RPC: get messages for a specific order, validated by tracking_number
CREATE OR REPLACE FUNCTION public.get_guest_messages_by_tracking(
  p_tracking_number TEXT,
  p_order_id UUID
)
RETURNS SETOF guest_order_messages
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM guest_orders
    WHERE id = p_order_id
    AND tracking_number = p_tracking_number
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT * FROM guest_order_messages
  WHERE order_id = p_order_id
  ORDER BY created_at ASC;
END;
$$;

-- 4. Grant execute to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_guest_documents_by_tracking(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_guest_documents_by_tracking(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_guest_messages_by_tracking(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_guest_messages_by_tracking(TEXT, UUID) TO authenticated;
