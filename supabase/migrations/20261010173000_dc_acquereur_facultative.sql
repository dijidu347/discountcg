-- DC : la pièce de l'acquéreur est demandée, pas exigée.
--
-- La migration précédente l'a remise visible ET obligatoire. Le second point
-- était de trop : « réactiver » voulait dire la remettre à l'écran, pas bloquer
-- un garage dessus.
--
-- La page 13 du guide SIV la mentionne sans la ranger parmi les documents
-- obligatoires. Rendre exigible chez nous ce que la préfecture n'exige pas,
-- c'est arrêter un dossier que l'État aurait accepté.
--
-- Elle reste donc affichée — c'était le vrai besoin : depuis qu'elle avait
-- disparu de l'écran, plus personne ne la déposait et l'équipe la redemandait
-- à la main.

update public.action_documents d
set obligatoire = false,
    obligatoire_depuis = null
from public.actions_rapides a
where d.action_id = a.id
  and a.code = 'DC'
  and d.nom_document ilike '%acqu%reur%';
