ALTER TABLE demarches ADD COLUMN IF NOT EXISTS client_nom text;
ALTER TABLE demarches ADD COLUMN IF NOT EXISTS client_prenom text;
ALTER TABLE demarches ADD COLUMN IF NOT EXISTS client_adresse text;