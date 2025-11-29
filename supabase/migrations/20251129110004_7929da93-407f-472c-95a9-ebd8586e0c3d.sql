-- Create a trigger to automatically assign 'garage' role when a new garage profile is created
CREATE OR REPLACE FUNCTION public.handle_new_garage_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user already has a role
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.user_id) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'garage');
  END IF;
  RETURN NEW;
END;
$$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_garage_created_assign_role ON public.garages;

-- Create trigger
CREATE TRIGGER on_garage_created_assign_role
  AFTER INSERT ON public.garages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_garage_role();