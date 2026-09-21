-- Comptes prospecteurs : acces aux garages, jamais aux demarches ni aux chiffres.
--
-- Un prospecteur cree son compte avec son propre email (espace particulier),
-- puis un administrateur lui donne le role « prospecteur ». Il ne lit rien
-- directement dans les tables : tout passe par des fonctions qui ne renvoient
-- que les colonnes autorisees (coordonnees, verification, inscription, actif
-- oui/non). Aucun montant, solde, nombre de demarches ni paiement.

-- Le role (ajoute a part : une valeur d'enum doit etre validee avant usage).
alter type public.app_role add value if not exists 'prospecteur';

-- Notes de prospection ----------------------------------------------------------
create table if not exists public.notes_prospection (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages(id) on delete cascade,
  auteur_id uuid not null,
  auteur_email text,
  contenu text not null check (length(btrim(contenu)) > 0),
  rappel_le date,
  created_at timestamptz not null default now()
);
create index if not exists notes_prospection_garage_idx on public.notes_prospection (garage_id, created_at desc);

-- Aucun acces direct : lecture et ecriture passent par les fonctions ci-dessous.
alter table public.notes_prospection enable row level security;

create or replace function public.est_prospecteur_ou_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(auth.uid(), 'prospecteur'::public.app_role)
      or public.has_role(auth.uid(), 'admin'::public.app_role)
$$;

-- Liste des garages pour la prospection --------------------------------------
create or replace function public.garages_prospection()
returns table (
  id uuid,
  raison_sociale text,
  siret text,
  email text,
  telephone text,
  adresse text,
  code_postal text,
  ville text,
  inscrit_le timestamptz,
  verification text,
  actif_90j boolean,
  derniere_note_le timestamptz,
  prochain_rappel date,
  nb_notes integer
)
language sql
stable
security definer
set search_path = public
as $$
  select g.id, g.raison_sociale, g.siret, g.email, g.telephone, g.adresse, g.code_postal, g.ville,
         g.created_at,
         case when g.is_verified then 'verifie'
              when g.verification_requested_at is not null
                or exists (select 1 from verification_documents v where v.garage_id = g.id) then 'en_cours'
              else 'jamais' end,
         exists (select 1 from demarches d
                  where d.garage_id = g.id and not d.is_draft
                    and (d.paye or d.paid_with_tokens or d.client_paid or d.is_free_token)
                    and d.created_at > now() - interval '90 days'),
         (select max(n.created_at) from notes_prospection n where n.garage_id = g.id),
         (select min(n.rappel_le) from notes_prospection n where n.garage_id = g.id and n.rappel_le >= current_date),
         (select count(*)::int from notes_prospection n where n.garage_id = g.id)
    from garages g
   where public.est_prospecteur_ou_admin()
   order by g.created_at desc;
$$;

-- Notes d'un garage ------------------------------------------------------------
create or replace function public.notes_prospection_garage(p_garage_id uuid)
returns table (id uuid, auteur_email text, contenu text, rappel_le date, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select n.id, n.auteur_email, n.contenu, n.rappel_le, n.created_at
    from notes_prospection n
   where n.garage_id = p_garage_id and public.est_prospecteur_ou_admin()
   order by n.created_at desc;
$$;

create or replace function public.ajouter_note_prospection(p_garage_id uuid, p_contenu text, p_rappel_le date default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.est_prospecteur_ou_admin() then raise exception 'non autorisé'; end if;
  if p_contenu is null or length(btrim(p_contenu)) = 0 then raise exception 'La note est vide.'; end if;
  insert into notes_prospection (garage_id, auteur_id, auteur_email, contenu, rappel_le)
  values (p_garage_id, auth.uid(), (select email from auth.users where id = auth.uid()), btrim(p_contenu), p_rappel_le)
  returning id into v_id;
  return v_id;
end;
$$;

-- Gestion des prospecteurs (administrateurs) -----------------------------------
create or replace function public.liste_prospecteurs()
returns table (user_id uuid, email text, depuis timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select r.user_id, u.email::text, r.created_at
    from user_roles r join auth.users u on u.id = r.user_id
   where r.role = 'prospecteur'::public.app_role
     and public.has_role(auth.uid(), 'admin'::public.app_role)
   order by r.created_at desc;
$$;

create or replace function public.definir_prospecteur(p_email text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
begin
  if not public.has_role(auth.uid(), 'admin'::public.app_role) then raise exception 'réservé aux administrateurs'; end if;
  select id into v_user from auth.users where lower(email) = lower(btrim(p_email));
  if v_user is null then
    raise exception 'Aucun compte avec cet email. Demandez au prospecteur de créer son compte sur le site (Espace particulier), puis recommencez.';
  end if;
  insert into user_roles (user_id, role) values (v_user, 'prospecteur'::public.app_role)
  on conflict (user_id, role) do nothing;
  return lower(btrim(p_email));
end;
$$;

create or replace function public.retirer_prospecteur(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin'::public.app_role) then raise exception 'réservé aux administrateurs'; end if;
  delete from user_roles where user_id = p_user_id and role = 'prospecteur'::public.app_role;
end;
$$;

revoke all on function public.garages_prospection() from public, anon;
revoke all on function public.notes_prospection_garage(uuid) from public, anon;
revoke all on function public.ajouter_note_prospection(uuid, text, date) from public, anon;
revoke all on function public.liste_prospecteurs() from public, anon;
revoke all on function public.definir_prospecteur(text) from public, anon;
revoke all on function public.retirer_prospecteur(uuid) from public, anon;
grant execute on function public.garages_prospection() to authenticated;
grant execute on function public.notes_prospection_garage(uuid) to authenticated;
grant execute on function public.ajouter_note_prospection(uuid, text, date) to authenticated;
grant execute on function public.liste_prospecteurs() to authenticated;
grant execute on function public.definir_prospecteur(text) to authenticated;
grant execute on function public.retirer_prospecteur(uuid) to authenticated;

-- Gestion des comptes (administrateurs) : tous les comptes et leurs roles, pour
-- distinguer professionnels, particuliers et prospecteurs.
create or replace function public.liste_comptes()
returns table (user_id uuid, email text, nom text, garage_id uuid, roles text[], inscrit_le timestamptz, derniere_connexion timestamptz)
language sql stable security definer set search_path = public as $$
  select u.id, u.email::text,
         coalesce(nullif(btrim(g.raison_sociale), ''),
                  nullif(btrim(concat_ws(' ', p.prenom, p.nom)), '')),
         g.id,
         coalesce((select array_agg(r.role::text order by r.role::text) from user_roles r where r.user_id = u.id), '{}'),
         u.created_at, u.last_sign_in_at
    from auth.users u
    left join garages g on g.user_id = u.id
    left join particulier_profiles p on p.user_id = u.id
   where public.has_role(auth.uid(), 'admin'::public.app_role)
   order by u.created_at desc;
$$;
revoke all on function public.liste_comptes() from public, anon;
grant execute on function public.liste_comptes() to authenticated;
