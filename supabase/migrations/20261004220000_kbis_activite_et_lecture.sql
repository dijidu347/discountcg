-- Ce qu'on lit sur un Kbis, et ce qu'on en dit au garage.
--
-- Le guide demande deux choses du Kbis, page 13 comme page 16 : qu'il ait moins
-- de six mois, et qu'il mentionne une activité d'achat-vente de véhicules. La
-- seconde se vérifiait à l'œil dans le PDF ; elle est maintenant recopiée à
-- côté de la date, pour que l'administration voie les deux avant d'accorder la
-- vérification plutôt que de le découvrir à la relance, six mois plus tard.

alter table public.verification_documents
  add column if not exists activite text;

comment on column public.verification_documents.activite is
  'Activité lue sur le Kbis, telle qu''elle y est imprimée. Le guide exige une activité d''achat-vente de véhicules : la montrer évite d''aller la chercher dans le PDF.';

-- Un document ne se lit qu'une fois. Sans cette marque, un Kbis dont la date
-- n'est pas lisible repasserait à chaque tour de la tâche, et serait payé à
-- chaque tour.
alter table public.verification_documents
  add column if not exists lu_le timestamptz;

comment on column public.verification_documents.lu_le is
  'Date de la lecture automatique du document. Posée même quand la lecture n''a rien donné : sans elle, un Kbis sans date lisible serait relu à chaque passage.';

-- Et le dire au garage au moment où il dépose, plutôt que de le refuser après.
update public.garage_verification_required_documents
set description = 'Extrait K-Bis de moins de 6 mois, mentionnant une activité d''achat-vente de véhicules'
where code = 'kbis';
