-- DC : un emplacement de pièce par co-acquéreur.
--
-- Une seule case acceptant plusieurs fichiers laissait croire qu'un document
-- suffisait, et ne disait pas lequel manquait quand il en manquait un. Trois
-- acheteurs en indivision, c'est trois pièces d'identité, et chacune doit se
-- voir réclamer séparément.
--
-- Le premier co-acquéreur garde la ligne existante — celle qui porte déjà des
-- pièces déposées sous son rang. Les suivants ont la leur, ajoutée après la
-- dernière ligne : un rang libéré appartient toujours aux pièces déposées
-- dessus, et le réutiliser les renommerait.
--
-- Les trois lignes existent en permanence et ne s'affichent qu'à partir du
-- nombre déclaré dans la réponse. « Quatre co-acquéreurs ou plus » ouvre la
-- quatrième, qui accepte les suivants.

insert into public.action_documents (action_id, nom_document, ordre, obligatoire, obligatoire_depuis, masque)
select a.id, v.nom,
       coalesce((select max(x.ordre) from public.action_documents x where x.action_id = a.id), 0) + v.rang,
       false, null, false
from public.actions_rapides a
cross join (values
  ('Pièce d''identité du 2e co-acquéreur (recto/verso)', 1),
  ('Pièce d''identité du 3e co-acquéreur (recto/verso)', 2),
  ('Pièce d''identité du 4e co-acquéreur (recto/verso)', 3)
) as v(nom, rang)
where a.code = 'DC'
  and not exists (
    select 1 from public.action_documents x
     where x.action_id = a.id and x.nom_document = v.nom);
