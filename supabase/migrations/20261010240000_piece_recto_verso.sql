-- Une pièce d'identité tient en deux faces, nommées.
--
-- Les fichiers d'une même pièce étaient listés avec leur date de dépôt, et il
-- fallait lire ces dates pour deviner s'il manquait le verso. Deux
-- emplacements nommés le disent d'un coup d'œil : celui qui est vide est
-- celui qui manque.
--
-- La colonne reste vide pour les pièces d'un seul tenant — un Kbis n'a pas de
-- verso — et pour les 487 dépôts antérieurs à ce découpage, que l'écran
-- rattache alors dans leur ordre d'arrivée, le premier au recto.
--
-- Le verso n'est pas exigé : une photocopie contenant les deux faces reste un
-- dépôt valable, déposée au recto.

alter table public.verification_documents
  add column if not exists face text;

comment on column public.verification_documents.face is
  'Pour une pièce qui tient en deux images : « recto » ou « verso ». Vide pour les pièces d''un seul tenant et pour les dépôts antérieurs à ce découpage.';
