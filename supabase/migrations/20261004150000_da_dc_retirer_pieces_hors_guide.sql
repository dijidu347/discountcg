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
--
-- Une case facultative ne bloque personne, mais elle se remplit quand même :
-- un garage qui voit un emplacement vide cherche quoi y mettre.
--
-- Les trois lignes sont en fin de liste : les supprimer ne décale aucun rang,
-- donc aucune pièce déjà déposée n'est renommée (les clés valent « doc_1 »,
-- « doc_2 »… dans l'ordre de cette table).

--   - la pièce d'identité de l'acquéreur, en DC. Le guide la liste page 13,
--     mais comme facultative : elle évite une faute d'orthographe dans la
--     cession. Une case que personne n'est tenu de remplir n'a pas sa place
--     dans la liste.
delete from public.action_documents d
using public.actions_rapides a
where d.action_id = a.id
  and a.code in ('DA', 'DC')
  and (d.nom_document ilike '%contrôle technique%'
       or (a.code = 'DA' and d.nom_document ilike '%dirigeant%')
       or (a.code = 'DC' and d.nom_document ilike '%acqu%reur%'));

-- La question « acheté auprès d'un professionnel ? » décide d'une pièce sur une
-- DA : si oui, le récépissé de déclaration d'achat du vendeur est dû (page 16,
-- dernière case, pour retracer la chaîne de propriété). Sur une DC, la page 13
-- ne demande aucun récépissé : la question n'y change rien et n'ajoutait qu'un
-- écran avant les pièces.
delete from public.action_questions q
using public.actions_rapides a
where q.action_id = a.id and a.code = 'DC';
