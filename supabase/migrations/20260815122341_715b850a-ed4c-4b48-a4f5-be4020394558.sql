CREATE TABLE public.vehicle_cache (
  plate       text PRIMARY KEY,
  found       boolean NOT NULL,
  data        jsonb,
  fetched_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  hit_count   integer NOT NULL DEFAULT 0,
  last_hit_at timestamptz
);

GRANT ALL ON public.vehicle_cache TO service_role;

ALTER TABLE public.vehicle_cache ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_vehicle_cache_expires ON public.vehicle_cache (expires_at);