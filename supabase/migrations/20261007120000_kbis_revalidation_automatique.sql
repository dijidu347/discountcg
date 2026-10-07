-- Rendre sa vérification à un garage qui dépose un Kbis à jour, sans attendre
-- qu'on l'approuve à la main.
--
-- Un garage qui avait sa vérification et l'a perdue parce que son Kbis a passé
-- six mois n'a rien à prouver de plus : son dossier a déjà été contrôlé par un
-- humain, il lui manquait un papier récent. Entre son dépôt et notre
-- approbation, il travaillait sans badge, parfois plusieurs jours.
--
-- La lecture automatique du Kbis décide désormais, sous quatre conditions
-- cumulatives (voir la fonction lecture-kbis) : le garage a déjà eu un Kbis
-- approuvé, le document lu est bien un Kbis daté, la date a moins de six mois,
-- et le SIREN imprimé est celui du garage. À défaut, la pièce reste en attente
-- et l'administration tranche, comme avant.

alter table public.verification_documents
  add column if not exists siren text,
  add column if not exists valide_automatiquement boolean not null default false;

comment on column public.verification_documents.siren is
  'SIREN lu sur le Kbis. Comparé à celui du garage avant toute revalidation automatique : un Kbis qui n''est pas le sien ne vaut rien.';

comment on column public.verification_documents.valide_automatiquement is
  'Vrai quand la pièce a été approuvée sans intervention humaine, après lecture. Sert à retrouver ces dossiers si une lecture se révèle fausse.';
