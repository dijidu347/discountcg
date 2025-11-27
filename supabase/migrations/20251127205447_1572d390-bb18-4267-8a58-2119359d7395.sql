-- Create a function to handle new user garage creation
CREATE OR REPLACE FUNCTION public.handle_new_garage_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create garage if the user metadata contains garage data
  IF NEW.raw_user_meta_data->>'raison_sociale' IS NOT NULL THEN
    INSERT INTO public.garages (
      user_id,
      raison_sociale,
      siret,
      adresse,
      code_postal,
      ville,
      email,
      telephone
    ) VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'raison_sociale',
      NEW.raw_user_meta_data->>'siret',
      NEW.raw_user_meta_data->>'adresse',
      NEW.raw_user_meta_data->>'code_postal',
      NEW.raw_user_meta_data->>'ville',
      NEW.raw_user_meta_data->>'email',
      NEW.raw_user_meta_data->>'telephone'
    );
    
    -- Assign garage role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'garage');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create garage profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created_garage ON auth.users;
CREATE TRIGGER on_auth_user_created_garage
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_garage_user();