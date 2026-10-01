create table if not exists public.solde_plaques (
  id smallint primary key default 1,
  solde integer not null,
  releve_le timestamptz not null default now(),
  -- Le seuil pour lequel l'alerte est déjà partie. Un rechargement remonte
  -- au-dessus des seuils, remet cette colonne à null, et réarme l'alerte.
  seuil_alerte_le integer,
  constraint solde_plaques_une_seule_ligne check (id = 1)
);

comment on table public.solde_plaques is
  'Crédits restants chez le fournisseur d''identification des plaques. Relevé quotidien.';

grant select on public.solde_plaques to authenticated;
grant all on public.solde_plaques to service_role;

alter table public.solde_plaques enable row level security;

-- Lecture réservée à l'administration : c'est une information de gestion, elle
-- n'a rien à faire dans le navigateur d'un client.
drop policy if exists "solde lisible par les admins" on public.solde_plaques;
create policy "solde lisible par les admins"
  on public.solde_plaques for select
  using (public.has_role(auth.uid(), 'admin'));

-- Écriture par la fonction de relevé seule, qui passe par la clé de service.