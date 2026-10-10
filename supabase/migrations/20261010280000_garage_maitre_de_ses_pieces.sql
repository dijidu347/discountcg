-- Un garage peut retirer n'importe laquelle de ses propres pièces.
--
-- Il ne pouvait supprimer que les pièces non examinées. Celles qui étaient
-- validées restaient affichées sans corbeille, et la différence n'était
-- lisible pour personne : deux documents côte à côte, l'un retirable et
-- l'autre non, sans que rien n'explique pourquoi.
--
-- Le garage reste donc maître de ce qu'il a envoyé. Le prix en est dit au
-- moment du clic : retirer une pièce validée rend le dossier incomplet, et
-- le compte devra être vérifié à nouveau.
--
-- Ce qu'il ne peut toujours pas faire : toucher aux pièces d'un autre garage,
-- ni aux documents d'une démarche, ni à l'historique des décisions — qui
-- garde la trace de chaque dépôt et de chaque validation.

drop policy if exists "Garages can delete their own rejected verification documents"
  on public.verification_documents;
drop policy if exists "Garages can delete their own unreviewed verification documents"
  on public.verification_documents;

create policy "Garages can delete their own verification documents"
on public.verification_documents
for delete
using (garage_id in (select g.id from public.garages g where g.user_id = auth.uid()));
