-- DC : la pièce de l'acquéreur devient obligatoire, et son libellé couvre les
-- sociétés.
--
-- Le guide la dit facultative page 13, et explique dans la même phrase
-- pourquoi il ne faut pas s'en passer : « permet de déclarer la cession sans
-- faute d'orthographe. Si la cession est enregistrée avec une faute, vous
-- serez responsable et l'acquéreur sera bloqué pour faire sa carte grise. »
-- L'équipe qui traite les dossiers a tranché : elle la veut exigée. C'est son
-- appel, pas celui du guide — la préfecture ne refusera pas un dossier sans,
-- nous si.
--
-- Une société n'a pas de pièce d'identité. Rendre la case obligatoire sans
-- toucher au libellé aurait arrêté tout garage vendant à une société devant
-- une demande impossible à satisfaire — et fait déposer n'importe quoi à sa
-- place. Le libellé nomme donc les deux cas, ce qui évite d'ajouter une
-- question de plus avant les pièces.

update public.action_documents d
set nom_document = 'Pièce d''identité de l''acquéreur (recto/verso) — ou de son dirigeant si l''acquéreur est une société',
    obligatoire = true,
    obligatoire_depuis = date '2026-10-10',
    masque = false
from public.actions_rapides a
where d.action_id = a.id
  and a.code = 'DC'
  and d.nom_document ilike '%acqu%reur%';
