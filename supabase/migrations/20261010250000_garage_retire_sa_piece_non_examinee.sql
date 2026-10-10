-- Un garage peut retirer une pièce que personne n'a encore examinée.
--
-- Il ne pouvait supprimer que ses pièces refusées. Celui qui s'apercevait
-- d'avoir envoyé la mauvaise photo n'avait donc aucun moyen de la reprendre :
-- il redéposait par-dessus, et l'administration recevait deux fichiers sans
-- savoir lequel compte.
--
-- La limite reste la même : une pièce approuvée fait partie du dossier, et
-- seule l'administration peut y toucher. Tant qu'elle est en attente, elle
-- n'appartient qu'au garage.

drop policy if exists "Garages can delete their own rejected verification documents"
  on public.verification_documents;

create policy "Garages can delete their own unreviewed verification documents"
on public.verification_documents
for delete
using (
  status in ('rejected', 'pending')
  and garage_id in (select g.id from public.garages g where g.user_id = auth.uid())
);
