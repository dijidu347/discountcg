-- Écarter un garage qui ne remplit pas les conditions.
--
-- Jusqu'ici tout garage inscrit traversait indéfiniment les files de
-- vérification. Celui dont l'activité ne comporte aucun achat-vente, celui
-- dont l'entreprise est radiée, celui qui a abandonné son dossier il y a un
-- an : tous revenaient dans « Dossier incomplet » chaque semaine, et l'équipe
-- rouvrait le même dossier pour reprendre la même décision.
--
-- « Non éligible » la fige. Le mot est choisi pour ne pas se confondre avec
-- le « Refusé » d'une pièce : la décision porte sur le COMPTE, pas sur un
-- document, et elle dit la raison — le garage ne remplit pas les conditions —
-- plutôt qu'un jugement.
--
-- Le motif est obligatoire. Une décision sans motif se rediscute six mois
-- plus tard sans que personne ne sache ce qui avait été constaté.
--
-- Ce que la décision ne fait PAS : bloquer les démarches. Le garage continue
-- de travailler, conformément à la règle posée pour les comptes non vérifiés.
-- Elle ne prévient pas non plus par email — écarter n'est pas une demande
-- adressée au garage ; « Écrire au garage » existe pour ça, avec les mots
-- qu'on aura choisis.

alter table public.garages
  add column if not exists non_eligible boolean not null default false,
  add column if not exists non_eligible_le timestamptz,
  add column if not exists non_eligible_motif text,
  add column if not exists non_eligible_par uuid;

comment on column public.garages.non_eligible is
  'Le garage ne remplit pas les conditions pour être vérifié. Distinct d''une pièce refusée : la décision porte sur le compte, et elle le sort des files de travail.';
comment on column public.garages.non_eligible_motif is
  'Pourquoi. Obligatoire à l''écriture.';
