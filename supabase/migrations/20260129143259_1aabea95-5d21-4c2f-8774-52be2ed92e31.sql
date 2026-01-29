-- Create new action: DEMANDE DE DUPLICATA CG
INSERT INTO public.actions_rapides (
  code,
  titre,
  description,
  prix,
  couleur,
  ordre,
  actif,
  require_immatriculation,
  test_only
) VALUES (
  'DUPLICATA_CG_PRO',
  'Demande de duplicata CG',
  'Demande de duplicata de carte grise en cas de perte, vol ou détérioration',
  29.90,
  'bg-amber-500',
  11,
  true,
  true,
  false
);

-- Get the action ID and insert required documents
DO $$
DECLARE
  action_id UUID;
BEGIN
  SELECT id INTO action_id FROM public.actions_rapides WHERE code = 'DUPLICATA_CG_PRO';
  
  -- Insert required documents
  INSERT INTO public.action_documents (action_id, nom_document, obligatoire, ordre) VALUES
    (action_id, 'Extrait Kbis de moins de 6 mois', true, 1),
    (action_id, 'Pièce d''identité du dirigeant (recto/verso)', true, 2),
    (action_id, 'Attestation d''assurance', true, 3),
    (action_id, 'Mandat signé et tamponné (Cerfa 13757)', true, 4),
    (action_id, 'Demande d''immatriculation signée et tamponnée (Cerfa 13750)', true, 5),
    (action_id, 'Déclaration de perte ou de vol signée et tamponnée (Cerfa 13753)', true, 6),
    (action_id, 'Contrôle technique en cours de validité', true, 7),
    (action_id, 'Mandat de la société de location (LOA/LLD/Crédit-Bail)', false, 8);
END $$;