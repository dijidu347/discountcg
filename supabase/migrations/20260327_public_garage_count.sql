-- Public function to return garage count (bypasses RLS, accessible to anon role)
CREATE OR REPLACE FUNCTION public.get_public_garage_count()
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM public.garages;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_public_garage_count() TO anon;
