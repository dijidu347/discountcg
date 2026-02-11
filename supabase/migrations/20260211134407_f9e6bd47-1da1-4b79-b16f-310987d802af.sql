
-- Add new enum value
ALTER TYPE public.demarche_type ADD VALUE IF NOT EXISTS 'MODIF_CG_PRO';

-- Insert action rapide
INSERT INTO public.actions_rapides (code, titre, description, prix, ordre, actif, couleur, require_immatriculation, test_only)
VALUES ('MODIF_CG_PRO', 'Modification / Correction de CG', 'Demande de modification ou correction du certificat d''immatriculation pour les sociétés', 29.90, 13, true, 'primary', true, false);

-- Insert base documents
INSERT INTO public.action_documents (action_id, nom_document, obligatoire, ordre)
SELECT id, 'Extrait Kbis de moins de 6 mois', true, 1 FROM actions_rapides WHERE code = 'MODIF_CG_PRO'
UNION ALL
SELECT id, 'Pièce d''identité du dirigeant (recto/verso)', true, 2 FROM actions_rapides WHERE code = 'MODIF_CG_PRO'
UNION ALL
SELECT id, 'Attestation d''assurance', true, 3 FROM actions_rapides WHERE code = 'MODIF_CG_PRO'
UNION ALL
SELECT id, 'Certificat d''immatriculation', true, 4 FROM actions_rapides WHERE code = 'MODIF_CG_PRO'
UNION ALL
SELECT id, 'Mandat signé et tamponné (cerfa 13757)', true, 5 FROM actions_rapides WHERE code = 'MODIF_CG_PRO'
UNION ALL
SELECT id, 'Demande d''immatriculation signée et tamponnée (cerfa 13750)', true, 6 FROM actions_rapides WHERE code = 'MODIF_CG_PRO'
UNION ALL
SELECT id, 'Pièce justificative officielle de la modification à apporter', true, 7 FROM actions_rapides WHERE code = 'MODIF_CG_PRO'
UNION ALL
SELECT id, 'Contrôle technique en cours de validité', true, 8 FROM actions_rapides WHERE code = 'MODIF_CG_PRO';
