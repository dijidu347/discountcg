-- DC : la pièce d'identité de l'acquéreur redevient demandée, et obligatoire.
--
-- Elle avait été ajoutée le 4 octobre à 11 h 31, puis masquée à 15 h le même
-- jour par la migration « da_dc_retirer_pieces_hors_guide », au motif que la
-- page 13 du guide SIV la liste comme facultative.
--
-- Le guide dit ce qui est exigible, pas ce dont l'équipe a besoin pour monter
-- un dossier. Les personnes qui traitent les DC réclament cette pièce : sans
-- elle, elles doivent la redemander au garage, dossier par dossier. Une
-- facultative qui se redemande à chaque fois n'est pas facultative.
--
-- Masquer une pièce la retire de l'écran sans la supprimer : son rang nomme
-- les pièces déjà déposées. La remettre, c'est donc lever le drapeau, pas
-- recréer la ligne — l'ordre 6 reste l'ordre 6, et les trois pièces déposées
-- sous ce rang gardent leur nom.

update public.action_documents d
set masque = false,
    obligatoire = true,
    obligatoire_depuis = date '2026-10-10'
from public.actions_rapides a
where d.action_id = a.id
  and a.code = 'DC'
  and d.nom_document ilike '%acqu%reur%';
