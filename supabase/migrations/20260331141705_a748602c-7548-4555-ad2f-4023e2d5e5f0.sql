-- Ajouter payment_mode à coffre_subscriptions
ALTER TABLE coffre_subscriptions
  ADD COLUMN IF NOT EXISTS payment_mode text NOT NULL DEFAULT 'stripe';

-- Mettre à jour le check constraint
ALTER TABLE coffre_subscriptions
  DROP CONSTRAINT IF EXISTS coffre_subscriptions_status_check;
ALTER TABLE coffre_subscriptions
  ADD CONSTRAINT coffre_subscriptions_status_check 
  CHECK (status IN ('pending', 'trialing', 'active', 'canceled', 'past_due', 'expired'));

-- Fonction de renouvellement auto des abonnements tokens
CREATE OR REPLACE FUNCTION renew_coffre_token_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sub RECORD;
  balance NUMERIC;
  monthly_price CONSTANT NUMERIC := 9.99;
  new_period_end TIMESTAMPTZ;
BEGIN
  FOR sub IN
    SELECT cs.id, cs.garage_id, cs.current_period_end, cs.cancel_at_period_end
    FROM coffre_subscriptions cs
    WHERE cs.payment_mode = 'tokens'
      AND cs.status = 'active'
      AND cs.current_period_end < NOW()
  LOOP
    IF sub.cancel_at_period_end THEN
      UPDATE coffre_subscriptions SET status = 'canceled' WHERE id = sub.id;
      CONTINUE;
    END IF;
    SELECT token_balance INTO balance FROM garages WHERE id = sub.garage_id;
    IF balance IS NULL OR balance < monthly_price THEN
      UPDATE coffre_subscriptions SET status = 'past_due' WHERE id = sub.id;
    ELSE
      UPDATE garages SET token_balance = token_balance - monthly_price WHERE id = sub.garage_id;
      new_period_end := COALESCE(sub.current_period_end, NOW()) + INTERVAL '30 days';
      UPDATE coffre_subscriptions
        SET current_period_start = COALESCE(current_period_end, NOW()),
            current_period_end = new_period_end
        WHERE id = sub.id;
    END IF;
  END LOOP;
END;
$$;

-- Fix RLS coffre_documents
DROP POLICY IF EXISTS "coffre_doc_insert_active" ON coffre_documents;
CREATE POLICY "coffre_doc_insert_own" ON coffre_documents
  FOR INSERT WITH CHECK (garage_id = get_user_garage_id());

DROP POLICY IF EXISTS "coffre_doc_update_own" ON coffre_documents;
CREATE POLICY "coffre_doc_update_own" ON coffre_documents
  FOR UPDATE USING (garage_id = get_user_garage_id())
  WITH CHECK (garage_id = get_user_garage_id());

-- Fix storage RLS
DROP POLICY IF EXISTS "coffre_storage_insert" ON storage.objects;
CREATE POLICY "coffre_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'coffre-fort-documents'
    AND (storage.foldername(name))[1] = get_user_garage_id()::text
  );
DROP POLICY IF EXISTS "coffre_storage_update" ON storage.objects;
CREATE POLICY "coffre_storage_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'coffre-fort-documents'
    AND (storage.foldername(name))[1] = get_user_garage_id()::text
  );