-- Commandes particulier : fin de la lecture publique.
--
-- Jusqu'ici, n'importe qui pouvait lire (et modifier) toutes les commandes
-- particulier, leurs pieces, les messages et les documents envoyes par l'admin :
-- noms, emails, telephones, adresses. Desormais un visiteur n'accede qu'a la
-- commande dont il presente l'identifiant dans l'en-tete x-commande-id
-- (src/lib/commandeParticulier.ts). Un particulier connecte voit en plus les
-- siennes ; les administrateurs voient tout. Le suivi par numero TRK passe par
-- la fonction get-guest-order, cote serveur.

create or replace function public.commande_demandee()
returns text
language sql
stable
as $$
  select coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-commande-id', '')
$$;

-- guest_orders ---------------------------------------------------------------
drop policy if exists "Allow authenticated select guest_orders" on public.guest_orders;
drop policy if exists "Anyone can view guest orders by tracking" on public.guest_orders;
drop policy if exists "Allow anon update guest_orders" on public.guest_orders;
drop policy if exists "Allow authenticated update guest_orders" on public.guest_orders;

create policy "Client : lecture de sa commande" on public.guest_orders
  for select to anon, authenticated
  using (id::text = public.commande_demandee());
create policy "Client : modification de sa commande" on public.guest_orders
  for update to anon, authenticated
  using (id::text = public.commande_demandee())
  with check (id::text = public.commande_demandee());

-- guest_order_documents ------------------------------------------------------
drop policy if exists "Allow authenticated delete guest_order_documents" on public.guest_order_documents;
drop policy if exists "Allow anon delete guest_order_documents" on public.guest_order_documents;
drop policy if exists "Allow authenticated insert guest_order_documents" on public.guest_order_documents;
drop policy if exists "Allow anon insert guest_order_documents" on public.guest_order_documents;
drop policy if exists "Anyone can upload documents" on public.guest_order_documents;
drop policy if exists "Allow anon select guest_order_documents" on public.guest_order_documents;
drop policy if exists "Anon can view guest order documents" on public.guest_order_documents;
drop policy if exists "Allow authenticated select guest_order_documents" on public.guest_order_documents;
drop policy if exists "Allow authenticated update guest_order_documents" on public.guest_order_documents;

create policy "Client : pieces de sa commande" on public.guest_order_documents
  for all to anon, authenticated
  using (order_id::text = public.commande_demandee())
  with check (order_id::text = public.commande_demandee());
create policy "Admins gerent les pieces des commandes particulier" on public.guest_order_documents
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- guest_order_messages : le client passe par la fonction guest-order-message --
drop policy if exists "Anon can insert guest order messages" on public.guest_order_messages;
drop policy if exists "Anon can view guest order messages by order" on public.guest_order_messages;

-- guest_order_admin_documents ------------------------------------------------
drop policy if exists "Public can view admin documents" on public.guest_order_admin_documents;
drop policy if exists "Anyone can view admin documents" on public.guest_order_admin_documents;

create policy "Client : documents admin de sa commande" on public.guest_order_admin_documents
  for select to anon, authenticated
  using (order_id::text = public.commande_demandee());
create policy "Particulier : documents admin de ses commandes" on public.guest_order_admin_documents
  for select to authenticated
  using (order_id in (select id from public.guest_orders where user_id = auth.uid()));

-- Rattachement des commandes a un compte particulier -------------------------
-- Remplace la mise a jour directe par email faite depuis le navigateur. Exige
-- un email verifie : sinon il suffirait de s'inscrire avec l'email d'un autre.
create or replace function public.rattacher_mes_commandes()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  if auth.uid() is null then
    return 0;
  end if;
  update public.guest_orders g
     set user_id = auth.uid()
    from auth.users u
   where u.id = auth.uid()
     and u.email_confirmed_at is not null
     and coalesce(u.email, '') <> ''
     and g.user_id is null
     and lower(g.email) = lower(u.email);
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.rattacher_mes_commandes() from public, anon;
grant execute on function public.rattacher_mes_commandes() to authenticated;
