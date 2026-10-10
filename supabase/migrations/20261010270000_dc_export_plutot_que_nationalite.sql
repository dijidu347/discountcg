-- DC : nommer l'export par sa destination, pas par la nationalité de l'acheteur.
--
-- « Un acheteur à l'étranger » se lisait comme une question de nationalité. Or
-- un étranger qui vit en France et achète une voiture qui restera immatriculée
-- en France est un particulier comme un autre : sa pièce d'identité suffit,
-- quel que soit son pays.
--
-- Le cas visé est tout autre : le véhicule QUITTE la France, la carte grise
-- française est clôturée, et il sera réimmatriculé ailleurs. C'est la
-- destination du véhicule qui compte, et le libellé le dit maintenant.

update public.action_question_options o
set option_text = 'Le véhicule part à l''étranger (export)'
from public.action_questions q, public.actions_rapides a
where o.question_id = q.id
  and q.action_id = a.id
  and a.code = 'DC'
  and q.question_text ilike 'précisez%'
  and o.option_text ilike '%étranger%';
