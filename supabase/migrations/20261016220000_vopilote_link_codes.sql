-- Le code qui relie un compte VO Pilote à un compte Discount Carte Grise.
--
-- Un garage qui tient son stock dans VO Pilote doit pouvoir envoyer ses démarches ici sans
-- ressaisir quoi que ce soit. Pour cela, les deux comptes doivent se reconnaître — et la preuve
-- ne peut pas être un SIRET, que n'importe qui peut lire sur un Kbis : il faut un geste du garage
-- depuis SON espace pro.
--
-- Il engendre donc ici un code court, valable quinze minutes et utilisable une seule fois. VO Pilote
-- le présente à l'API, qui répond une fois avec l'identité du garage, puis brûle le code.
--
-- Le code n'est pas conservé en clair : seule son empreinte est stockée. Le garage le voit une fois,
-- à l'écran, au moment où il le crée. Perdu, il en engendre un autre.
CREATE TABLE IF NOT EXISTS public.vopilote_link_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  garage_id uuid NOT NULL REFERENCES public.garages(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  cree_le timestamptz NOT NULL DEFAULT now(),
  expire_le timestamptz NOT NULL,
  utilise_le timestamptz,
  utilise_par text
);
COMMENT ON TABLE public.vopilote_link_codes IS 'Codes à usage unique reliant un compte VO Pilote à un garage. Jamais en clair : seule l''empreinte est gardée.';
CREATE INDEX IF NOT EXISTS vopilote_link_codes_hash ON public.vopilote_link_codes (code_hash) WHERE utilise_le IS NULL;
CREATE INDEX IF NOT EXISTS vopilote_link_codes_garage ON public.vopilote_link_codes (garage_id, cree_le DESC);

ALTER TABLE public.vopilote_link_codes ENABLE ROW LEVEL SECURITY;

-- Le garage voit ses propres codes — leur existence et leur date, jamais leur valeur, qui n'est pas stockée.
DROP POLICY IF EXISTS vopilote_link_codes_own_read ON public.vopilote_link_codes;
CREATE POLICY vopilote_link_codes_own_read ON public.vopilote_link_codes FOR SELECT TO authenticated
  USING (garage_id IN (SELECT g.id FROM public.garages g WHERE g.user_id = auth.uid()));

-- La création passe par une fonction : elle seule connaît le code en clair, le temps de le rendre.
CREATE OR REPLACE FUNCTION public.creer_code_liaison_vopilote()
RETURNS TABLE(code text, expire_le timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g uuid; brut text; fin timestamptz;
BEGIN
  SELECT id INTO g FROM public.garages WHERE user_id = auth.uid() LIMIT 1;
  IF g IS NULL THEN RAISE EXCEPTION 'Aucun compte garage pour cet utilisateur.'; END IF;

  -- Un code que l'on relit au téléphone sans se tromper : pas de 0/O ni de 1/I/L.
  brut := (SELECT string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random()*31)::int, 1), '') FROM generate_series(1,8));
  fin := now() + interval '15 minutes';

  -- Un seul code vivant à la fois : en engendrer un nouveau annule le précédent.
  UPDATE public.vopilote_link_codes SET utilise_le = now(), utilise_par = 'remplacé'
   WHERE garage_id = g AND utilise_le IS NULL;

  INSERT INTO public.vopilote_link_codes (garage_id, code_hash, expire_le)
  VALUES (g, encode(extensions.digest(brut, 'sha256'), 'hex'), fin);

  RETURN QUERY SELECT brut, fin;
END $$;
REVOKE ALL ON FUNCTION public.creer_code_liaison_vopilote() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.creer_code_liaison_vopilote() TO authenticated;

-- La vérification, appelée par le serveur de VO Pilote.
--
-- Elle est ouverte au rôle « anon » et c'est volontaire : le code EST la preuve. Le secret ne peut
-- pas être une clé d'API, sinon la clé prouverait seulement que l'appel vient de VO Pilote, jamais
-- que ce garage-là a consenti. Huit caractères pris dans un alphabet de trente et un, valables un
-- quart d'heure, un seul code vivant par garage : chercher au hasard n'a aucune chance d'aboutir.
--
-- Elle rend l'identité une seule fois, puis brûle le code.
CREATE OR REPLACE FUNCTION public.verifier_code_liaison_vopilote(_code text)
RETURNS TABLE(garage_id uuid, raison_sociale text, siret text, ville text, verifie boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ligne public.vopilote_link_codes; empreinte text;
BEGIN
  IF nullif(trim(coalesce(_code,'')),'') IS NULL THEN RAISE EXCEPTION 'Code de liaison manquant.'; END IF;
  empreinte := encode(extensions.digest(upper(trim(_code)), 'sha256'), 'hex');

  SELECT * INTO ligne FROM public.vopilote_link_codes
   WHERE code_hash = empreinte AND utilise_le IS NULL
   ORDER BY cree_le DESC LIMIT 1
   FOR UPDATE;

  IF ligne.id IS NULL THEN RAISE EXCEPTION 'Code inconnu ou déjà utilisé. Engendrez-en un nouveau depuis votre espace Discount Carte Grise.'; END IF;
  IF ligne.expire_le < now() THEN RAISE EXCEPTION 'Ce code a expiré. Engendrez-en un nouveau : il reste valable quinze minutes.'; END IF;

  UPDATE public.vopilote_link_codes SET utilise_le = now(), utilise_par = 'vopilote' WHERE id = ligne.id;

  RETURN QUERY
    SELECT g.id, g.raison_sociale, g.siret, g.ville, g.is_verified
      FROM public.garages g WHERE g.id = ligne.garage_id;
END $$;
REVOKE ALL ON FUNCTION public.verifier_code_liaison_vopilote(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verifier_code_liaison_vopilote(text) TO anon, authenticated;
