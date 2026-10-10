-- DC : « Autre » ouvre une liste des cas réels.
--
-- La question « Qui achète le véhicule ? » a trois réponses, dont « Autre ».
-- Laisser « Autre » sans suite revient à ne rien savoir du dossier : ni quelle
-- pièce réclamer, ni ce que l'équipe trouvera en ouvrant le dossier.
--
-- Cinq cas existent vraiment et aucun ne méritait sa place parmi les trois
-- réponses principales : chacun est rare, et les aligner ferait passer
-- l'exception pour la règle. Ils vivent donc dans une liste déroulante qui
-- n'apparaît que sur « Autre ».
--
-- Convention : une question dont le texte commence par « Précisez » n'est pas
-- une question de plus. C'est le détail de celle qui la précède, l'écran ne
-- l'affiche que si la réponse est « Autre », et ne la réclame pas sinon.

insert into public.action_questions (action_id, question_text, ordre, is_blocking, blocking_message)
select a.id, 'Précisez qui achète', 3, false, null
from public.actions_rapides a
where a.code = 'DC'
  and not exists (
    select 1 from public.action_questions q
     where q.action_id = a.id and q.question_text ilike 'précisez%');

insert into public.action_question_options (question_id, option_text, ordre, is_blocking, blocking_message)
select q.id, v.texte, v.rang, false, null
from public.actions_rapides a
join public.action_questions q on q.action_id = a.id and q.question_text ilike 'précisez%'
cross join (values
  ('Une association', 1),
  ('Une administration ou une collectivité', 2),
  ('Un centre VHU agréé (destruction)', 3),
  ('Un acheteur à l''étranger', 4),
  ('Plusieurs co-acquéreurs', 5)
) as v(texte, rang)
where a.code = 'DC'
  and not exists (
    select 1 from public.action_question_options o
     where o.question_id = q.id and o.option_text = v.texte);
