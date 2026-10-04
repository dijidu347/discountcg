-- DA et DC : ne demander que les pièces du guide, et ne poser une question que
-- si sa réponse change la liste.
--
-- Trois cases facultatives traînaient à l'écran sans jamais être dues :
--   - le contrôle technique, en DA et en DC. Les listes « DOCUMENTS
--     OBLIGATOIRES » du guide (page 16 pour la DA, page 13 pour la DC) ne le
--     mentionnent pas. Il ne figure que dans la check-list de l'annexe 5, qui
--     dit quoi vérifier sur les pièces présentes.
--   - la pièce d'identité du dirigeant, en DA. Le guide l'exige page 16, mais
--     nous l'avons déjà : la vérification du compte garage la réclame et
--     l'approuve. La redemander au dossier a fait déposer 32 pièces pour rien.
--   - la pièce d'identité de l'acquéreur, en DC. Le guide la liste page 13,
--     mais comme facultative.
--
-- Une case facultative ne bloque personne, mais elle se remplit quand même :
-- un garage qui voit un emplacement vide cherche quoi y mettre.

-- Retirer une pièce, ce n'est pas supprimer sa ligne. Les pièces déposées sont
-- rangées par le RANG de la ligne — « doc_1 », « doc_2 »… dans l'ordre de cette
-- table — et non par son identifiant : supprimer une ligne fait porter son rang
-- à la suivante, et les pièces déjà déposées changent de nom sans bouger.
-- D'où ce drapeau : la ligne reste, elle garde son rang, elle ne s'affiche plus.
alter table public.action_documents
  add column if not exists masque boolean not null default false;

comment on column public.action_documents.masque is
  'Pièce retirée de la liste du garage, mais conservée : les pièces déjà déposées sont rangées par leur rang (doc_1, doc_2…), et supprimer la ligne ferait porter ce rang à la suivante.';

update public.action_documents d
set masque = true, obligatoire = false
from public.actions_rapides a
where d.action_id = a.id
  and a.code in ('DA', 'DC')
  and (d.nom_document ilike '%contrôle technique%'
       or (a.code = 'DA' and d.nom_document ilike '%dirigeant%')
       or (a.code = 'DC' and d.nom_document ilike '%acqu%reur%'));

-- La question « acheté auprès d'un professionnel ? » décide d'une pièce sur une
-- DA : si oui, le récépissé de déclaration d'achat du vendeur est dû (page 16,
-- dernière case, pour retracer la chaîne de propriété). Sur une DC, la page 13
-- ne demande aucun récépissé : la question n'y change rien et n'ajoutait qu'un
-- écran avant les pièces. Celle qui la remplace est posée dans la migration
-- suivante, et elle, elle décide bien de pièces.
delete from public.action_questions q
using public.actions_rapides a
where q.action_id = a.id and a.code = 'DC'
  and q.question_text ilike '%professionnel%';
