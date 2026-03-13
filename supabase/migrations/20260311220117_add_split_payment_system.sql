-- Split Payment System: Pro/Particulier payment modes
-- Allows pro to choose who pays: pro pays all, client pays all, or split

-- 1. Add payment mode columns to demarches
ALTER TABLE demarches
  ADD COLUMN IF NOT EXISTS payment_mode text NOT NULL DEFAULT 'pro_pays_all'
    CHECK (payment_mode IN ('pro_pays_all', 'client_pays_all', 'split')),
  ADD COLUMN IF NOT EXISTS client_payment_token uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS client_payment_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_email text,
  ADD COLUMN IF NOT EXISTS client_phone text,
  ADD COLUMN IF NOT EXISTS client_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS client_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_stripe_payment_id text,
  ADD COLUMN IF NOT EXISTS pro_payment_pending boolean NOT NULL DEFAULT false;

-- 2. Add payer_type to paiements
ALTER TABLE paiements
  ADD COLUMN IF NOT EXISTS payer_type text NOT NULL DEFAULT 'pro'
    CHECK (payer_type IN ('pro', 'client'));

-- 3. Create payment_reminders table
CREATE TABLE IF NOT EXISTS payment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demarche_id uuid NOT NULL REFERENCES demarches(id) ON DELETE CASCADE,
  reminder_number integer NOT NULL CHECK (reminder_number BETWEEN 1 AND 3),
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(demarche_id, reminder_number)
);

-- 4. Index for fast lookup by payment token
CREATE UNIQUE INDEX IF NOT EXISTS idx_demarches_client_payment_token
  ON demarches(client_payment_token)
  WHERE client_payment_token IS NOT NULL;

-- 5. Index for cron job: find demarches awaiting client payment
CREATE INDEX IF NOT EXISTS idx_demarches_awaiting_client_payment
  ON demarches(client_payment_token_expires_at)
  WHERE payment_mode IN ('client_pays_all', 'split')
    AND client_paid = false
    AND status = 'en_attente_paiement_client';

-- 6. RLS for payment_reminders (admin only via service role)
ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (edge functions use service role)
CREATE POLICY "Service role full access on payment_reminders"
  ON payment_reminders
  FOR ALL
  USING (true)
  WITH CHECK (true);
