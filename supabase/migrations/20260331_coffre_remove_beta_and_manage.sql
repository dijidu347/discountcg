-- Remove beta subscription for mathieugaillac4@gmail.com
-- (user wants to test real Stripe payment flow)
DELETE FROM coffre_subscriptions
WHERE garage_id IN (
  SELECT g.id FROM garages g
  JOIN auth.users u ON u.id = g.user_id
  WHERE u.email = 'mathieugaillac4@gmail.com'
);

-- Add payment_mode check to include 'beta' if not already present
ALTER TABLE coffre_subscriptions
  DROP CONSTRAINT IF EXISTS coffre_subscriptions_status_check;
ALTER TABLE coffre_subscriptions
  ADD CONSTRAINT coffre_subscriptions_status_check
  CHECK (status IN ('pending', 'trialing', 'active', 'canceled', 'past_due', 'expired'));

-- Add payment_mode column if not already there
ALTER TABLE coffre_subscriptions
  ADD COLUMN IF NOT EXISTS payment_mode text NOT NULL DEFAULT 'stripe';
