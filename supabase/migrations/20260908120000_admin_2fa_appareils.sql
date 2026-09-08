-- Second facteur par e-mail sur les comptes administrateurs.
--
-- Le mot de passe seul ouvrait l'administration. Un code a 6 chiffres est
-- desormais demande a la premiere connexion depuis un appareil inconnu ;
-- l'appareil est ensuite memorise et ne le redemande plus.
--
-- Les deux tables ne sont jamais lues depuis le navigateur : seules les edge
-- functions y accedent, avec la cle de service. La RLS est donc activee SANS
-- policy, ce qui ferme la table a tout le monde sauf au service_role.

-- Appareils reconnus. On ne stocke que l'empreinte du jeton, jamais le jeton
-- lui-meme : une fuite de la table ne permettrait pas de se faire passer pour
-- un appareil de confiance.
CREATE TABLE IF NOT EXISTS public.admin_trusted_devices (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash   text NOT NULL UNIQUE,
  user_agent   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL DEFAULT now() + interval '60 days'
);

CREATE INDEX IF NOT EXISTS admin_trusted_devices_user_idx
  ON public.admin_trusted_devices (user_id);

ALTER TABLE public.admin_trusted_devices ENABLE ROW LEVEL SECURITY;

-- Codes en attente de saisie. Egalement stockes sous forme d'empreinte.
CREATE TABLE IF NOT EXISTS public.admin_login_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash   text NOT NULL,
  attempts    integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT now() + interval '10 minutes',
  consumed_at timestamptz
);

CREATE INDEX IF NOT EXISTS admin_login_codes_user_idx
  ON public.admin_login_codes (user_id, created_at DESC);

ALTER TABLE public.admin_login_codes ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.admin_trusted_devices IS
  'Appareils reconnus pour le second facteur admin. Acces service_role uniquement.';
COMMENT ON TABLE public.admin_login_codes IS
  'Codes a 6 chiffres en attente de verification. Acces service_role uniquement.';
