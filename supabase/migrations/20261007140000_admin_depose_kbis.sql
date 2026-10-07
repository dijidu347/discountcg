-- L'administration ne pouvait pas déposer un document de vérification.
--
-- La fiche d'un garage propose « ajouter un document », et le dépôt échouait
-- systématiquement sur « Impossible d'uploader le document » : le fichier
-- partait bien dans le stockage, mais l'écriture en base était refusée. La
-- table n'avait qu'une politique d'insertion, pour le garage lui-même.
--
-- Le cas se présente dès qu'un garage envoie son Kbis par e-mail au lieu de le
-- déposer, ce qui arrive d'autant plus souvent que son espace ne le lui
-- permettait pas jusqu'à hier.

create policy "Admins can insert verification documents"
  on public.verification_documents for insert
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Et de quoi retirer une pièce déposée par erreur, ce qui manquait aussi.
create policy "Admins can delete verification documents"
  on public.verification_documents for delete
  using (public.has_role(auth.uid(), 'admin'::public.app_role));
