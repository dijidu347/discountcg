-- DC : le récépissé de déclaration d'achat revient, quand le garage vend.
--
-- Je l'avais masqué le 4 octobre au motif que la page 13 du guide ne le liste
-- pas. Le guide dit ce qu'il faut pour déclarer ; l'arrêté du 9 février 2009,
-- chapitre 5, dit ce que le professionnel doit remettre à son acquéreur :
--
--   — revente à un autre professionnel : certificat de cession, certificat
--     d'immatriculation, COPIE DU RÉCÉPISSÉ DE SA DÉCLARATION D'ACHAT,
--     certificat de situation administrative ;
--   — revente à un particulier : certificat de cession, COPIE DU RÉCÉPISSÉ DE
--     LA DÉCLARATION D'ACHAT PRÉCÉDENTE, certificat d'immatriculation barré,
--     certificat de situation administrative.
--
-- La pièce est donc due dans les deux cas, mais seulement quand c'est NOTRE
-- garage qui vend : lui seul a une déclaration d'achat à produire. Quand il
-- mandate la cession d'un particulier, il n'y en a aucune.
--
-- Les chiffres le confirmaient déjà : 784 des 1642 DC payées de l'année —
-- 48 % — portaient ce récépissé spontanément, pour une proportion de ventes
-- par le garage lui-même mesurée à 60 %.
--
-- Le libellé devient « Récépissé de votre déclaration d'achat » : il n'est
-- demandé qu'au garage vendeur, et « du vendeur professionnel » le faisait
-- chercher ailleurs.

update public.action_documents d
set masque = false,
    nom_document = 'Récépissé de votre déclaration d''achat'
from public.actions_rapides a
where d.action_id = a.id
  and a.code = 'DC'
  and d.ordre = 4;
