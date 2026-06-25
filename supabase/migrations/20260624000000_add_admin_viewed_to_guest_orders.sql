-- Add column to track if admin has viewed/processed the guest order (système "non vu")
ALTER TABLE public.guest_orders ADD COLUMN IF NOT EXISTS admin_viewed boolean DEFAULT false;

-- Mark already-closed paid orders as viewed so the rollout doesn't flag closed history as "new"
UPDATE public.guest_orders SET admin_viewed = true WHERE paye = true AND status IN ('finalise', 'refuse');
