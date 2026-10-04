CREATE TABLE public.vehicle_lookup_quota (
  cle text NOT NULL,
  fenetre timestamptz NOT NULL,
  appels integer NOT NULL DEFAULT 0,
  PRIMARY KEY (cle, fenetre)
);
GRANT ALL ON public.vehicle_lookup_quota TO service_role;
ALTER TABLE public.vehicle_lookup_quota ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consommer_quota_plaque(p_cle text, p_fenetre timestamptz, p_plafond integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appels integer;
BEGIN
  INSERT INTO public.vehicle_lookup_quota AS q (cle, fenetre, appels)
  VALUES (p_cle, p_fenetre, 1)
  ON CONFLICT (cle, fenetre) DO UPDATE SET appels = q.appels + 1
  RETURNING q.appels INTO v_appels;
  RETURN v_appels <= p_plafond;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consommer_quota_plaque(text, timestamptz, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consommer_quota_plaque(text, timestamptz, integer) TO service_role;