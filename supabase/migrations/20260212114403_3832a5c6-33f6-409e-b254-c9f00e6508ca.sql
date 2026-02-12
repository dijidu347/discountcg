
-- Add new enum value
ALTER TYPE public.demarche_type ADD VALUE IF NOT EXISTS 'CHANGEMENT_ADRESSE_LOCATAIRE_PRO';

-- Insert action rapide
INSERT INTO public.actions_rapides (code, titre, description, prix, ordre, actif, couleur, require_immatriculation, test_only)
VALUES ('CHANGEMENT_ADRESSE_LOCATAIRE_PRO', 'Changement d''adresse du locataire', 'Changement d''adresse du locataire sur le certificat d''immatriculation pour les sociétés', 30, 15, true, 'primary', false, false);

-- Insert base documents
INSERT INTO public.action_documents (action_id, nom_document, obligatoire, ordre)
SELECT id, 'Extrait Kbis de moins de 6 mois + Pièce d''identité du dirigeant (recto/verso)', true, 1 FROM actions_rapides WHERE code = 'CHANGEMENT_ADRESSE_LOCATAIRE_PRO'
UNION ALL
SELECT id, 'Certificat d''immatriculation', true, 2 FROM actions_rapides WHERE code = 'CHANGEMENT_ADRESSE_LOCATAIRE_PRO'
UNION ALL
SELECT id, 'Mandat signé et tamponné par le locataire (Cerfa 13757)', true, 3 FROM actions_rapides WHERE code = 'CHANGEMENT_ADRESSE_LOCATAIRE_PRO'
UNION ALL
SELECT id, 'Mandat signé et tamponné par le bailleur autorisant le locataire à effectuer des modifications', true, 4 FROM actions_rapides WHERE code = 'CHANGEMENT_ADRESSE_LOCATAIRE_PRO'
UNION ALL
SELECT id, 'Demande d''immatriculation signée et tamponnée par le locataire (Cerfa 13750)', true, 5 FROM actions_rapides WHERE code = 'CHANGEMENT_ADRESSE_LOCATAIRE_PRO'
UNION ALL
SELECT id, 'Extrait Kbis de moins de 6 mois mis à jour', true, 6 FROM actions_rapides WHERE code = 'CHANGEMENT_ADRESSE_LOCATAIRE_PRO';
