-- DC : demander les pièces de l'acquéreur selon qui achète.
--
-- Symétrique de « Qui vend le véhicule ? ». Un particulier fournit sa pièce
-- d'identité ; une société n'en a pas — elle fournit son Kbis et la pièce de
-- son dirigeant, celui qui signe le certificat de cession.
--
-- Rendre la pièce d'identité de l'acquéreur obligatoire sans poser la question
-- aurait arrêté tout garage vendant à une société devant une demande
-- impossible à satisfaire, et fait déposer n'importe quoi à sa place.
--
-- Troisième réponse, « Autre », pour ce qui existe vraiment sans mériter une
-- option chacun : une association, une mairie, un centre VHU agréé quand le
-- véhicule part à la destruction, un acheteur à l'étranger, plusieurs
-- co-acquéreurs. Aucune pièce d'acquéreur n'est alors exigée — mieux vaut un
-- dossier à compléter à la main qu'un garage bloqué sur une case qui ne
-- correspond pas à son cas.
--
-- Les deux nouvelles pièces sont ajoutées APRÈS la dernière ligne, masquées
-- comprises : un rang libéré appartient toujours aux pièces déposées dessus.

insert into public.action_questions (action_id, question_text, ordre, is_blocking, blocking_message)
select a.id, 'Qui achète le véhicule ?', 2, false, null
from public.actions_rapides a
where a.code = 'DC'
  and not exists (
    select 1 from public.action_questions q
     where q.action_id = a.id and q.question_text ilike '%qui ach%te%');

insert into public.action_question_options (question_id, option_text, ordre, is_blocking, blocking_message)
select q.id, v.texte, v.rang, false, null
from public.actions_rapides a
join public.action_questions q on q.action_id = a.id and q.question_text ilike '%qui ach%te%'
cross join (values ('Un particulier', 1), ('Une société', 2), ('Autre', 3)) as v(texte, rang)
where a.code = 'DC'
  and not exists (
    select 1 from public.action_question_options o
     where o.question_id = q.id and o.option_text = v.texte);

-- Le libellé combiné « ou de son dirigeant si l'acquéreur est une société »
-- n'a plus lieu d'être : la question distingue les deux cas, chacun a sa
-- ligne. La pièce cesse d'être obligatoire en base — c'est la réponse qui
-- décide, et un brouillon ouvert avant la question continue de la demander.
update public.action_documents d
set nom_document = 'Pièce d''identité de l''acquéreur (recto/verso)',
    obligatoire = false,
    obligatoire_depuis = null,
    masque = false
from public.actions_rapides a
where d.action_id = a.id and a.code = 'DC' and d.nom_document ilike '%acqu%reur%';

insert into public.action_documents (action_id, nom_document, ordre, obligatoire, obligatoire_depuis, masque)
select a.id, v.nom,
       coalesce((select max(x.ordre) from public.action_documents x where x.action_id = a.id), 0) + v.rang,
       false, null, false
from public.actions_rapides a
cross join (values
  ('Extrait Kbis de l''acquéreur (moins de 6 mois)', 1),
  ('Pièce d''identité du dirigeant de l''acquéreur (recto/verso)', 2)
) as v(nom, rang)
where a.code = 'DC'
  and not exists (
    select 1 from public.action_documents x
     where x.action_id = a.id and x.nom_document = v.nom);
