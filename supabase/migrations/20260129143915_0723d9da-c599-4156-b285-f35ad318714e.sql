-- Get the action ID for DUPLICATA_CG_PRO
DO $$
DECLARE
  action_id UUID;
  q1_id UUID;
  q2_id UUID;
  q1_opt1_id UUID;
  q1_opt2_id UUID;
  q1_opt3_id UUID;
  q2_opt1_id UUID;
  q2_opt2_id UUID;
BEGIN
  SELECT id INTO action_id FROM actions_rapides WHERE code = 'DUPLICATA_CG_PRO';
  
  -- Question 1: État du contrôle technique
  q1_id := gen_random_uuid();
  INSERT INTO action_questions (id, action_id, question_text, ordre, is_blocking, blocking_message)
  VALUES (q1_id, action_id, 'Quel est l''état du contrôle technique ?', 1, false, null);
  
  -- Options for Question 1
  q1_opt1_id := gen_random_uuid();
  INSERT INTO action_question_options (id, question_id, option_text, ordre, is_blocking, blocking_message)
  VALUES (q1_opt1_id, q1_id, 'En cours de validité', 1, false, null);
  
  q1_opt2_id := gen_random_uuid();
  INSERT INTO action_question_options (id, question_id, option_text, ordre, is_blocking, blocking_message)
  VALUES (q1_opt2_id, q1_id, 'Égaré (mais valide)', 2, false, 'ℹ️ Si le PV de contrôle technique est perdu, le client doit contacter le centre ayant réalisé le contrôle afin d''obtenir un duplicata par mail. Exceptionnellement, une photo de la vignette pare-brise peut être fournie à l''ANTS.');
  
  q1_opt3_id := gen_random_uuid();
  INSERT INTO action_question_options (id, question_id, option_text, ordre, is_blocking, blocking_message)
  VALUES (q1_opt3_id, q1_id, 'Expiré (plus de 2 ans)', 3, true, '🚫 Si le contrôle technique a plus de 2 ans, la demande ne peut pas être envoyée. Il est nécessaire de réaliser une fiche d''identification, de passer le véhicule au contrôle technique, puis de lancer la demande de duplicata.');
  
  -- Question 2: Véhicule en LOA/LLD/Crédit-bail
  q2_id := gen_random_uuid();
  INSERT INTO action_questions (id, action_id, question_text, ordre, is_blocking, blocking_message)
  VALUES (q2_id, action_id, 'Le véhicule est-il en LOA, LLD ou crédit-bail ?', 2, false, null);
  
  -- Options for Question 2
  q2_opt1_id := gen_random_uuid();
  INSERT INTO action_question_options (id, question_id, option_text, ordre, is_blocking, blocking_message)
  VALUES (q2_opt1_id, q2_id, 'Oui', 1, false, null);
  
  q2_opt2_id := gen_random_uuid();
  INSERT INTO action_question_options (id, question_id, option_text, ordre, is_blocking, blocking_message)
  VALUES (q2_opt2_id, q2_id, 'Non', 2, false, null);
  
  -- Conditional document for LOA/LLD option (q2_opt1)
  INSERT INTO action_conditional_documents (option_id, nom_document, obligatoire)
  VALUES (q2_opt1_id, 'Mandat de la société de location autorisant le locataire à effectuer la démarche', true);
  
END $$;