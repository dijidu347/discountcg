-- DC : chaque cas d'« Autre » réclame la pièce qui identifie vraiment
-- l'acheteur.
--
-- « Autre » ne peut pas rester une case sans suite : dans tous les cas il faut
-- pouvoir dire qui achète, et deux de ces acheteurs n'ont pas de pièce
-- d'identité du tout.
--
--   - Association : pas de Kbis. Son existence se prouve par son récépissé de
--     déclaration en préfecture ou sa parution au Journal officiel, et c'est
--     son président qui signe.
--   - Administration ou collectivité : inscrite à aucun registre du commerce.
--     Ce qui compte est que le signataire ait le droit d'engager la
--     collectivité — d'où le courrier à en-tête ou la délégation de signature.
--   - Centre VHU agréé : une société, donc Kbis et pièce du dirigeant, PLUS
--     son agrément préfectoral. C'est le seul cas où la pièce manquante a une
--     conséquence juridique : hors d'un centre agréé, la destruction n'est pas
--     opposable et le véhicule reste au nom du vendeur.
--   - Acheteur à l'étranger : sa pièce d'identité, quel que soit le pays.
--   - Co-acquéreurs : chacun figure sur la carte grise, donc chacun doit être
--     identifié. Le nombre est demandé dans la réponse, et le libellé de la
--     pièce le reprend — « pièce d'identité de l'acquéreur » au singulier face
--     à trois acheteurs en indivision se remplit une fois, et le dossier
--     repart incomplet alors que le champ accepte plusieurs fichiers.

update public.action_question_options o
set option_text = v.texte, ordre = v.rang
from public.action_questions q, public.actions_rapides a,
     (values ('Deux co-acquéreurs', 5)) as v(texte, rang)
where o.question_id = q.id and q.action_id = a.id and a.code = 'DC'
  and q.question_text ilike 'précisez%'
  and o.option_text = 'Plusieurs co-acquéreurs';

insert into public.action_question_options (question_id, option_text, ordre, is_blocking, blocking_message)
select q.id, v.texte, v.rang, false, null
from public.actions_rapides a
join public.action_questions q on q.action_id = a.id and q.question_text ilike 'précisez%'
cross join (values
  ('Deux co-acquéreurs', 5),
  ('Trois co-acquéreurs', 6),
  ('Quatre co-acquéreurs ou plus', 7)
) as v(texte, rang)
where a.code = 'DC'
  and not exists (
    select 1 from public.action_question_options o
     where o.question_id = q.id and o.option_text = v.texte);

insert into public.action_documents (action_id, nom_document, ordre, obligatoire, obligatoire_depuis, masque)
select a.id, v.nom,
       coalesce((select max(x.ordre) from public.action_documents x where x.action_id = a.id), 0) + v.rang,
       false, null, false
from public.actions_rapides a
cross join (values
  ('Récépissé de déclaration en préfecture ou parution au Journal officiel (association)', 1),
  ('Courrier à en-tête ou délégation de signature (administration ou collectivité)', 2),
  ('Agrément préfectoral VHU du centre de destruction', 3)
) as v(nom, rang)
where a.code = 'DC'
  and not exists (
    select 1 from public.action_documents x
     where x.action_id = a.id and x.nom_document = v.nom);
