-- Detail du calcul carte grise, fige au moment du calcul (snapshot)

ALTER TABLE public.demarches ADD COLUMN IF NOT EXISTS prix_cv numeric;

ALTER TABLE public.demarches ADD COLUMN IF NOT EXISTS prix_cv_avant_abattement numeric;

ALTER TABLE public.demarches ADD COLUMN IF NOT EXISTS taxe_parafiscale numeric;

ALTER TABLE public.demarches ADD COLUMN IF NOT EXISTS sous_total_arrondi numeric;

ALTER TABLE public.guest_orders ADD COLUMN IF NOT EXISTS prix_cv numeric;

ALTER TABLE public.guest_orders ADD COLUMN IF NOT EXISTS prix_cv_avant_abattement numeric;

ALTER TABLE public.guest_orders ADD COLUMN IF NOT EXISTS taxe_parafiscale numeric;

ALTER TABLE public.guest_orders ADD COLUMN IF NOT EXISTS sous_total_arrondi numeric;

ALTER TABLE public.guest_orders ADD COLUMN IF NOT EXISTS genre text;

COMMENT ON COLUMN public.demarches.sous_total_arrondi IS 'Snapshot du detail du calcul carte grise au moment du calcul. Ne jamais recalculer a l affichage : le tarif regional change dans le temps.';

COMMENT ON COLUMN public.guest_orders.sous_total_arrondi IS 'Snapshot du detail du calcul carte grise au moment du calcul. Ne jamais recalculer a l affichage : le tarif regional change dans le temps.';