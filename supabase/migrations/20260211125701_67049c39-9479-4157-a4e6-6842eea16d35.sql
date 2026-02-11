
-- 1. Add new enum value CG_NEUF_PRO
ALTER TYPE public.demarche_type ADD VALUE IF NOT EXISTS 'CG_NEUF_PRO';

-- 2. Insert the action rapide
INSERT INTO public.actions_rapides (code, titre, description, prix, couleur, ordre, actif, require_immatriculation, test_only)
VALUES (
  'CG_NEUF_PRO',
  'Immatriculation véhicule neuf',
  'Demande de certificat d''immatriculation d''un véhicule neuf (sociétés)',
  29.90,
  '#f59e0b',
  70,
  true,
  false,
  false
);

-- 3. Insert questionnaire questions
-- Question 1: Mode d'acquisition
INSERT INTO public.action_questions (action_id, question_text, ordre, is_blocking, blocking_message)
VALUES (
  (SELECT id FROM public.actions_rapides WHERE code = 'CG_NEUF_PRO'),
  'Le véhicule est-il en LOA, LLD ou crédit-bail ?',
  1,
  false,
  NULL
);

-- Options for question 1
INSERT INTO public.action_question_options (question_id, option_text, ordre, is_blocking, blocking_message)
VALUES
  ((SELECT id FROM public.action_questions WHERE action_id = (SELECT id FROM public.actions_rapides WHERE code = 'CG_NEUF_PRO') AND ordre = 1), 'Non', 1, false, NULL),
  ((SELECT id FROM public.action_questions WHERE action_id = (SELECT id FROM public.actions_rapides WHERE code = 'CG_NEUF_PRO') AND ordre = 1), 'Oui (LOA/LLD/Crédit-bail)', 2, false, NULL);

-- 4. Insert base documents
INSERT INTO public.action_documents (action_id, nom_document, obligatoire, ordre)
VALUES
  ((SELECT id FROM public.actions_rapides WHERE code = 'CG_NEUF_PRO'), 'Extrait Kbis de moins de 6 mois', true, 1),
  ((SELECT id FROM public.actions_rapides WHERE code = 'CG_NEUF_PRO'), 'Pièce d''identité du dirigeant (recto/verso)', true, 2),
  ((SELECT id FROM public.actions_rapides WHERE code = 'CG_NEUF_PRO'), 'Attestation d''assurance', true, 3),
  ((SELECT id FROM public.actions_rapides WHERE code = 'CG_NEUF_PRO'), 'Mandat signé et tamponné (Cerfa 13757)', true, 4),
  ((SELECT id FROM public.actions_rapides WHERE code = 'CG_NEUF_PRO'), 'Cerfa 13749 remis par le constructeur – Demande de certificat d''immatriculation d''un véhicule neuf', true, 5);

-- 5. Conditional documents for LOA option
INSERT INTO public.action_conditional_documents (option_id, nom_document, obligatoire)
VALUES
  ((SELECT id FROM public.action_question_options WHERE question_id = (SELECT id FROM public.action_questions WHERE action_id = (SELECT id FROM public.actions_rapides WHERE code = 'CG_NEUF_PRO') AND ordre = 1) AND ordre = 2), 'Contrat de location complet', true),
  ((SELECT id FROM public.action_question_options WHERE question_id = (SELECT id FROM public.action_questions WHERE action_id = (SELECT id FROM public.actions_rapides WHERE code = 'CG_NEUF_PRO') AND ordre = 1) AND ordre = 2), 'Mandat de la société de location autorisant le locataire à effectuer la démarche', true);
