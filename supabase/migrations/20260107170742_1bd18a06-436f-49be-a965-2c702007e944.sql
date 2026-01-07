-- Drop the old constraint
ALTER TABLE public.factures DROP CONSTRAINT IF EXISTS factures_type_check;

-- Add new constraint that allows token_purchase_id as a third type
ALTER TABLE public.factures ADD CONSTRAINT factures_type_check CHECK (
  (
    (demarche_id IS NOT NULL AND guest_order_id IS NULL AND token_purchase_id IS NULL) OR
    (demarche_id IS NULL AND guest_order_id IS NOT NULL AND token_purchase_id IS NULL) OR
    (demarche_id IS NULL AND guest_order_id IS NULL AND token_purchase_id IS NOT NULL)
  )
);