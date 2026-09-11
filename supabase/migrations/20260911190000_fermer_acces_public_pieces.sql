-- Pieces justificatives : fin des acces publics residuels.
--
-- Le bucket guest-order-documents etait prive, mais d'anciennes regles
-- "Anyone can..." laissaient n'importe quel visiteur, avec la cle publique du
-- site, lister, telecharger et supprimer les pieces des particuliers. Les
-- particuliers gardent le droit de deposer (INSERT) ; la lecture passe par les
-- liens signes des fonctions get-signed-url et download-file.

drop policy if exists "Anyone can view guest order documents" on storage.objects;
drop policy if exists "Public read guest-order-documents" on storage.objects;
drop policy if exists "Allow public read guest-order-documents" on storage.objects;
drop policy if exists "Allow public delete guest-order-documents" on storage.objects;
drop policy if exists "Anyone can delete guest order documents" on storage.objects;

create policy "Admins can view guest order documents" on storage.objects for select
  using (bucket_id = 'guest-order-documents' and public.has_role(auth.uid(), 'admin'::public.app_role));
create policy "Admins can update guest order documents" on storage.objects for update
  using (bucket_id = 'guest-order-documents' and public.has_role(auth.uid(), 'admin'::public.app_role));
create policy "Admins can delete guest order documents" on storage.objects for delete
  using (bucket_id = 'guest-order-documents' and public.has_role(auth.uid(), 'admin'::public.app_role));
