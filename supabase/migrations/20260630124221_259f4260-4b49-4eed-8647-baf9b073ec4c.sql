ALTER TABLE public.demarches ADD COLUMN IF NOT EXISTS express boolean NOT NULL DEFAULT false;
ALTER TABLE public.guest_orders ADD COLUMN IF NOT EXISTS express boolean NOT NULL DEFAULT false;