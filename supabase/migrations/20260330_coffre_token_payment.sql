-- Add payment_mode to coffre_subscriptions
-- Supports 'stripe' (default) and 'tokens' (paid via jeton balance)
ALTER TABLE coffre_subscriptions
  ADD COLUMN IF NOT EXISTS payment_mode text NOT NULL DEFAULT 'stripe';

COMMENT ON COLUMN coffre_subscriptions.payment_mode IS 'stripe | tokens — how the subscription is paid';

-- Create renew function for token-based subscriptions (called by cron)
CREATE OR REPLACE FUNCTION renew_coffre_token_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sub RECORD;
  balance NUMERIC;
  monthly_price CONSTANT NUMERIC := 9.99;
  new_period_end TIMESTAMPTZ;
BEGIN
  -- Process token subscriptions that have expired
  FOR sub IN
    SELECT cs.id, cs.garage_id, cs.current_period_end, cs.cancel_at_period_end
    FROM coffre_subscriptions cs
    WHERE cs.payment_mode = 'tokens'
      AND cs.status = 'active'
      AND cs.current_period_end < NOW()
  LOOP
    -- If set to cancel, mark as canceled
    IF sub.cancel_at_period_end THEN
      UPDATE coffre_subscriptions SET status = 'canceled' WHERE id = sub.id;
      CONTINUE;
    END IF;

    -- Check garage token balance
    SELECT token_balance INTO balance FROM garages WHERE id = sub.garage_id;

    IF balance IS NULL OR balance < monthly_price THEN
      -- Insufficient tokens → past_due
      UPDATE coffre_subscriptions SET status = 'past_due' WHERE id = sub.id;
    ELSE
      -- Deduct tokens and extend period
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
