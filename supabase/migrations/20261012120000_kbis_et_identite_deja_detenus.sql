-- Le Kbis et la pièce d'identité du dirigeant ne se réclament plus au dossier.
--
-- Le garage nous les a déjà remis : c'est exactement ce que contient la
-- vérification de son compte depuis le 21/09/2026. Les redemander à chaque
-- démarche lui faisait redéposer deux fichiers que nous détenons, sur dix-neuf
-- lignes réparties sur onze types de démarches professionnelles.
--
-- On MASQUE, on ne supprime pas. Le rang d'une pièce nomme les fichiers déjà
-- déposés dessus (`doc_3`, `doc_4`…) : supprimer une ligne décalerait tous les
-- rangs suivants et les dossiers en cours perdraient le lien avec leurs
-- fichiers. La ligne reste, elle cesse simplement de s'afficher.
--
-- Trois familles ne sont PAS touchées, parce qu'il ne s'agit pas de doublons :
--
--   - le « Kbis de moins de 6 mois MIS À JOUR » des changements d'adresse :
--     c'est la preuve de la nouvelle adresse, l'objet même de la démarche ;
--   - les pièces du VENDEUR et de l'ACQUÉREUR sur la déclaration de cession, et
--     celles « des deux parties » sur les annulations : ce sont des tiers, dont
--     nous ne détenons rien ;
--   - les justificatifs de domicile, du siège ou du dirigeant : la vérification
--     du compte ne prend que le Kbis et la carte d'identité.

update public.action_documents d
   set masque = true
  from public.actions_rapides a
 where a.id = d.action_id
   and a.code like '%\_PRO'
   and d.masque is distinct from true
   and d.nom_document ~* '^(extrait kbis|pièce d''identité du (dirigeant|représentant))'
   and d.nom_document !~* 'mis à jour|deux parties|domicile|vendeur|acquéreur';
