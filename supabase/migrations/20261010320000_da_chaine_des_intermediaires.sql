-- DA : un récépissé par intermédiaire, et non un seul.
--
-- La page 16 du guide, sous « DOCUMENTS OBLIGATOIRES », dit exactement ceci :
--
--   « Si le véhicule a été acheté auprès d'un autre professionnel de
--     l'automobile, fournir le récépissé de déclaration d'achat du
--     professionnel vendeur. S'il y a eu plusieurs intermédiaires
--     professionnels de l'automobile, fournir la DA pour CHACUN afin de
--     retracer la chaîne de propriété. »
--
-- Notre emplacement unique laissait croire qu'un seul suffisait. Le libellé
-- le dit maintenant ; les récépissés supplémentaires se déposent dans les
-- pièces libres, qui existent déjà.
--
-- La question « Le véhicule a-t-il été acheté auprès d'un professionnel ? »
-- continue de décider si la pièce est due.

update public.action_documents d
set nom_document = 'Récépissé de déclaration d''achat du vendeur professionnel — un par intermédiaire s''il y en a eu plusieurs'
from public.actions_rapides a
where d.action_id = a.id and a.code = 'DA' and d.ordre = 4;
