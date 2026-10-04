-- DC : demander les pièces d'identité selon qui vend.
--
-- La page 13 du guide a deux colonnes, et elles parlent du VENDEUR : un
-- particulier fournit sa pièce d'identité, une société fournit son Kbis de
-- moins de 6 mois et la pièce d'identité de son dirigeant.
--
-- Sur 107 DC lues par le contrôle en 60 jours, le vendeur est :
--   - le garage lui-même dans 64 cas (60 %) — son Kbis et la pièce de son
--     dirigeant sont déjà chez nous, approuvés à la vérification du compte ;
--   - un particulier dans 30 cas (28 %) — sa pièce d'identité, qu'on demandait
--     déjà, est la bonne ;
--   - une autre société dans 13 cas (12 %) — LEASYS FRANCE, un autre garage,
--     un loueur : là, il manquait son Kbis.
--
-- D'où une question, et une seule, qui décide des trois cas.

insert into public.action_questions (action_id, question_text, ordre, is_blocking, blocking_message)
select a.id, 'Qui vend le véhicule ?', 1, false, null
from public.actions_rapides a
where a.code = 'DC'
  and not exists (
    select 1 from public.action_questions q
     where q.action_id = a.id and q.question_text ilike '%qui vend%'
  );

insert into public.action_question_options (question_id, option_text, ordre, is_blocking, blocking_message)
select q.id, v.texte, v.rang, false, null
from public.actions_rapides a
join public.action_questions q on q.action_id = a.id and q.question_text ilike '%qui vend%'
cross join (values ('Mon garage', 1), ('Un particulier', 2), ('Une autre société', 3)) as v(texte, rang)
where a.code = 'DC'
  and not exists (
    select 1 from public.action_question_options o
     where o.question_id = q.id and o.option_text = v.texte
  );

-- Le Kbis du vendeur : dû seulement quand le vendeur est une autre société.
-- Ajouté en fin de liste, donc aucun rang n'est décalé et aucune pièce déjà
-- déposée n'est renommée (les clés valent « doc_1 », « doc_2 »… dans l'ordre
-- de cette table).
insert into public.action_documents (action_id, nom_document, ordre, obligatoire, obligatoire_depuis)
select a.id, 'Extrait Kbis du vendeur (moins de 6 mois)',
       coalesce((select max(d.ordre) from public.action_documents d where d.action_id = a.id), 0) + 1,
       false, date '2026-10-04'
from public.actions_rapides a
where a.code = 'DC'
  and not exists (
    select 1 from public.action_documents d
     where d.action_id = a.id and d.nom_document ilike '%kbis%'
  );

-- La pièce d'identité du vendeur cesse d'être due pour tout le monde : le
-- garage qui vend sa propre voiture nous l'a déjà donnée en se faisant
-- vérifier. Elle reste due d'un particulier, et d'une société tierce — c'est
-- alors celle de son dirigeant. La condition se juge au dépôt et au contrôle,
-- la case « obligatoire » ne sait pas l'exprimer.
update public.action_documents d
set obligatoire = false
from public.actions_rapides a
where d.action_id = a.id and a.code = 'DC'
  and d.nom_document ilike '%identité du vendeur%';
