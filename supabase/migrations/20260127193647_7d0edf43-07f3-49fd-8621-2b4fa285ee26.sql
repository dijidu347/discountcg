-- Add new demarche type for address change
ALTER TYPE demarche_type ADD VALUE IF NOT EXISTS 'CHANGEMENT_ADRESSE_PRO';

-- Insert the new action into actions_rapides
INSERT INTO actions_rapides (code, titre, description, prix, couleur, ordre, actif, require_immatriculation, test_only)
VALUES (
  'CHANGEMENT_ADRESSE_PRO',
  'Changement d''adresse du titulaire',
  'Modification de l''adresse du titulaire sur le certificat d''immatriculation',
  30,
  'orange',
  7,
  true,
  true,
  false
);

-- Insert required documents for this action
INSERT INTO action_documents (action_id, nom_document, obligatoire, ordre)
SELECT 
  id,
  unnest(ARRAY[
    'Pièce d''identité du dirigeant (recto/verso)',
    'Certificat d''immatriculation',
    'Mandat signé et tamponné (Cerfa 13757)',
    'Demande d''immatriculation signée et tamponnée (Cerfa 13750)',
    'Extrait Kbis de moins de 6 mois mis à jour'
  ]),
  true,
  generate_series(1, 5)
FROM actions_rapides
WHERE code = 'CHANGEMENT_ADRESSE_PRO';