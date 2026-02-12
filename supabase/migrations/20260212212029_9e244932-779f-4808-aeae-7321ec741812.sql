
ALTER TYPE public.demarche_type ADD VALUE IF NOT EXISTS 'IMMAT_DEFINITIVE_PRO';

INSERT INTO public.actions_rapides (code, titre, description, prix, ordre, actif, require_immatriculation, couleur)
VALUES ('IMMAT_DEFINITIVE_PRO', 'Demande d''immatriculation définitive', 'Passage d''une immatriculation provisoire (WW) à une immatriculation définitive', 29.90, 150, true, true, 'primary');

DO $$
DECLARE
  action_uuid uuid;
BEGIN
  SELECT id INTO action_uuid FROM public.actions_rapides WHERE code = 'IMMAT_DEFINITIVE_PRO';

  INSERT INTO public.action_documents (action_id, nom_document, ordre, obligatoire) VALUES
    (action_uuid, 'Extrait Kbis de moins de 6 mois + Pièce d''identité du dirigeant (recto/verso)', 1, true),
    (action_uuid, 'Attestation d''assurance', 2, true),
    (action_uuid, 'Mandat signé (Cerfa 13757)', 3, true),
    (action_uuid, 'Demande d''immatriculation signée (Cerfa 13750)', 4, true),
    (action_uuid, 'Certificat d''immatriculation étranger', 5, true),
    (action_uuid, 'Certificat de conformité COC', 6, true),
    (action_uuid, 'Facture d''achat ou Certificat de cession', 7, true),
    (action_uuid, 'Quitus fiscal', 8, true),
    (action_uuid, 'Contrôle technique français ou étranger de moins de 6 mois', 9, false);
END $$;
