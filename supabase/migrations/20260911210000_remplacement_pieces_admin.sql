-- demarche-documents : n'importe quel compte connecte pouvait remplacer
-- n'importe quelle piece, y compris celles des autres garages. Aucun ecran ne
-- remplace de fichier dans ce bucket ; le remplacement est reserve aux
-- administrateurs (outil de compression compris). Le depot et la lecture des
-- garages ne changent pas.

drop policy if exists "Users can update their own demarche documents" on storage.objects;
create policy "Admins can update demarche documents" on storage.objects for update
  using (bucket_id = 'demarche-documents' and public.has_role(auth.uid(), 'admin'::public.app_role));
