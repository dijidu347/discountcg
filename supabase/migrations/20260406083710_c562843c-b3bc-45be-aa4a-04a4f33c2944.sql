
-- 1. Add 'particulier' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'particulier';

-- 2. Create particulier_profiles table
CREATE TABLE public.particulier_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  nom text NOT NULL DEFAULT '',
  prenom text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  telephone text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Add user_id column to guest_orders
ALTER TABLE public.guest_orders ADD COLUMN IF NOT EXISTS user_id uuid;

-- 4. Enable RLS on particulier_profiles
ALTER TABLE public.particulier_profiles ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view their own profile
CREATE POLICY "Users can view own particulier profile"
  ON public.particulier_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS: Users can update their own profile
CREATE POLICY "Users can update own particulier profile"
  ON public.particulier_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS: Users can insert their own profile
CREATE POLICY "Users can insert own particulier profile"
  ON public.particulier_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS: Admins can manage all profiles
CREATE POLICY "Admins can manage particulier profiles"
  ON public.particulier_profiles FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. RLS for guest_orders: particuliers can view their own orders
CREATE POLICY "Particuliers can view own orders"
  ON public.guest_orders FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 6. RLS: particuliers can update their own orders (for linking)
CREATE POLICY "Particuliers can update own orders"
  ON public.guest_orders FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- 7. Trigger to auto-create particulier profile and role on signup
CREATE OR REPLACE FUNCTION public.handle_new_particulier_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only process if user has particulier metadata flag
  IF NEW.raw_user_meta_data->>'account_type' = 'particulier' THEN
    INSERT INTO public.particulier_profiles (user_id, nom, prenom, email, telephone)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'nom', ''),
      COALESCE(NEW.raw_user_meta_data->>'prenom', ''),
      COALESCE(NEW.email, ''),
      COALESCE(NEW.raw_user_meta_data->>'telephone', '')
    )
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'particulier')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Auto-link existing guest orders with same email
    UPDATE public.guest_orders
    SET user_id = NEW.id
    WHERE LOWER(email) = LOWER(NEW.email)
      AND user_id IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on auth.users for particulier
CREATE TRIGGER on_auth_user_created_particulier
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_particulier_user();

-- 8. Updated_at trigger for particulier_profiles
CREATE TRIGGER update_particulier_profiles_updated_at
  BEFORE UPDATE ON public.particulier_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
