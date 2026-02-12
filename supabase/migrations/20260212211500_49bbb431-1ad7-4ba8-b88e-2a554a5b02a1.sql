
-- Add new demarche type to enum
ALTER TYPE public.demarche_type ADD VALUE IF NOT EXISTS 'COTITULAIRE_PRO';

-- Insert action rapide
INSERT INTO public.actions_rapides (code, titre, description, prix, ordre, actif, require_immatriculation, couleur)
VALUES ('COTITULAIRE_PRO', 'Ajouter ou retirer un co-titulaire', 'Ajout ou retrait d''un co-titulaire sur la carte grise', 29.90, 120, true, true, 'primary');

-- Get action ID for documents and questions
DO $$
DECLARE
  action_uuid uuid;
  q1_uuid uuid;
  opt_ajouter uuid;
  opt_retirer uuid;
BEGIN
  SELECT id INTO action_uuid FROM public.actions_rapides WHERE code = 'COTITULAIRE_PRO';

  -- Insert question: Ajouter ou retirer ?
  INSERT INTO public.action_questions (action_id, question_text, ordre, is_blocking, blocking_message)
  VALUES (action_uuid, 'Souhaitez-vous ajouter ou retirer un co-titulaire ?', 1, false, null)
  RETURNING id INTO q1_uuid;

  INSERT INTO public.action_question_options (question_id, option_text, ordre, is_blocking, blocking_message)
  VALUES (q1_uuid, 'Ajouter un co-titulaire', 1, false, null)
  RETURNING id INTO opt_ajouter;

  INSERT INTO public.action_question_options (question_id, option_text, ordre, is_blocking, blocking_message)
  VALUES (q1_uuid, 'Retirer un co-titulaire', 2, false, null)
  RETURNING id INTO opt_retirer;

  -- Base documents (communs aux deux cas)
  INSERT INTO public.action_documents (action_id, nom_document, ordre, obligatoire) VALUES
    (action_uuid, 'Pièce d''identité et permis de conduire du titulaire (recto/verso)', 1, true),
    (action_uuid, 'Justificatif de domicile de moins de 6 mois du titulaire', 2, true),
    (action_uuid, 'Attestation d''assurance', 3, true),
    (action_uuid, 'Mandat signé (Cerfa 13757)', 4, true),
    (action_uuid, 'Demande d''immatriculation signée (Cerfa 13750)', 5, true),
    (action_uuid, 'Contrôle technique en cours de validité', 6, true);

  -- Conditional docs for "Ajouter"
  INSERT INTO public.action_conditional_documents (option_id, nom_document, obligatoire) VALUES
    (opt_ajouter, 'Pièce d''identité et permis de conduire du co-titulaire à ajouter (recto/verso)', true),
    (opt_ajouter, 'Attestation signée par les deux parties mentionnant l''ajout du co-titulaire (ou Acte de mariage / Attestation de PACS)', true);

  -- Conditional docs for "Retirer"
  INSERT INTO public.action_conditional_documents (option_id, nom_document, obligatoire) VALUES
    (opt_retirer, 'Pièce d''identité et permis de conduire du co-titulaire à retirer (recto/verso)', true),
    (opt_retirer, 'Certificat de cession ou attestation signée par les deux parties mentionnant le retrait du co-titulaire (ou Acte de divorce / Rupture de PACS)', true);

END $$;
