-- Add retention_discount_applied flag to coffre_subscriptions
-- Tracks whether the -50% retention offer has been used (once per account)
ALTER TABLE coffre_subscriptions
ADD COLUMN IF NOT EXISTS retention_discount_applied boolean DEFAULT false;
