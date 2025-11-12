-- Add numero_demarche column to demarches table
ALTER TABLE demarches ADD COLUMN IF NOT EXISTS numero_demarche TEXT UNIQUE;

-- Create function to generate unique demarche number
CREATE OR REPLACE FUNCTION public.generate_demarche_numero()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  year_prefix TEXT;
  next_number INTEGER;
  new_numero TEXT;
BEGIN
  year_prefix := TO_CHAR(NOW(), 'YYYY');
  
  -- Get the highest number for current year
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(numero_demarche FROM LENGTH('DEM-' || year_prefix || '-') + 1)
        AS INTEGER
      )
    ),
    0
  ) + 1
  INTO next_number
  FROM demarches
  WHERE numero_demarche LIKE 'DEM-' || year_prefix || '-%';
  
  new_numero := 'DEM-' || year_prefix || '-' || LPAD(next_number::TEXT, 5, '0');
  
  RETURN new_numero;
END;
$$;

-- Create trigger to auto-generate numero_demarche on insert
CREATE OR REPLACE FUNCTION public.set_demarche_numero()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.numero_demarche IS NULL THEN
    NEW.numero_demarche := public.generate_demarche_numero();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_demarche_numero_trigger ON demarches;
CREATE TRIGGER set_demarche_numero_trigger
  BEFORE INSERT ON demarches
  FOR EACH ROW
  EXECUTE FUNCTION public.set_demarche_numero();

-- Update existing demarches without numero
DO $$
DECLARE
  dem RECORD;
BEGIN
  FOR dem IN SELECT id FROM demarches WHERE numero_demarche IS NULL ORDER BY created_at
  LOOP
    UPDATE demarches 
    SET numero_demarche = public.generate_demarche_numero()
    WHERE id = dem.id;
  END LOOP;
END $$;