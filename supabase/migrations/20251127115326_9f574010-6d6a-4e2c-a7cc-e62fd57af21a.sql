-- Add fields to track resubmission payment requirement for guest orders
ALTER TABLE public.guest_orders 
ADD COLUMN IF NOT EXISTS requires_resubmission_payment boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS resubmission_payment_amount numeric DEFAULT 10,
ADD COLUMN IF NOT EXISTS resubmission_paid boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS resubmission_payment_intent_id text;

-- Add comment for documentation
COMMENT ON COLUMN public.guest_orders.requires_resubmission_payment IS 'True if client must pay to resubmit documents after abuse';
COMMENT ON COLUMN public.guest_orders.resubmission_paid IS 'True if resubmission payment has been completed';