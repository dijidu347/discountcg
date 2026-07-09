CREATE TABLE IF NOT EXISTS public.tariff_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region text NOT NULL,
  nouveau_tarif numeric NOT NULL,
  date_effet date NOT NULL,
  applique boolean NOT NULL DEFAULT false,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz
);

COMMENT ON TABLE public.tariff_changes IS 'Changements de tarif regional programmes. Appliques automatiquement a department_tariffs a la date d effet par la fonction apply-tariff-changes.';

GRANT SELECT ON public.tariff_changes TO authenticated;
GRANT ALL ON public.tariff_changes TO service_role;

ALTER TABLE public.tariff_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tariff changes"
  ON public.tariff_changes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage tariff changes"
  ON public.tariff_changes
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));