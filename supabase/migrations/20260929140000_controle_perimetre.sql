-- Périmètre du contrôle automatique.
--
-- On démarre sur les déclarations d'achat et de cession : ce sont les deux tiers
-- des dossiers et les plus simples à contrôler (cinq pièces, toujours les
-- mêmes). Les autres types s'ajoutent en basculant `actif` à true, sans
-- toucher au code ni redéployer quoi que ce soit.

create table if not exists public.controle_types_actifs (
  type text primary key,
  actif boolean not null default false,
  maj_le timestamptz not null default now()
);

alter table public.controle_types_actifs enable row level security;

drop policy if exists "Admins lisent le perimetre" on public.controle_types_actifs;
create policy "Admins lisent le perimetre" on public.controle_types_actifs
  for select using (has_role(auth.uid(), 'admin'::app_role));

insert into public.controle_types_actifs (type, actif) values
  ('DA', true),
  ('DC', true)
on conflict (type) do update set actif = excluded.actif, maj_le = now();

create or replace function public.type_sous_controle(p_type text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.controle_types_actifs where type = p_type and actif);
$$;

grant execute on function public.type_sous_controle(text) to authenticated;

-- Mise en file d'une pièce dès son dépôt, dans le périmètre actif uniquement.
create or replace function public.mettre_document_en_file()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type text;
begin
  if new.type_document like 'admin\_%' then
    return new;
  end if;

  select d.type::text into v_type from public.demarches d where d.id = new.demarche_id;
  if v_type is null or not public.type_sous_controle(v_type) then
    return new;
  end if;

  insert into public.analyses_documents (document_id, demarche_id)
  values (new.id, new.demarche_id)
  on conflict (document_id) do nothing;

  return new;
end;
$$;

create or replace function public.relancer_controle_dossier(p_demarche_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nb integer;
  v_type text;
begin
  if not has_role(auth.uid(), 'admin'::app_role) then
    raise exception 'Réservé aux administrateurs';
  end if;

  select d.type::text into v_type from public.demarches d where d.id = p_demarche_id;
  if v_type is null or not public.type_sous_controle(v_type) then
    raise exception 'Le contrôle automatique n''est pas activé pour ce type de démarche';
  end if;

  insert into public.analyses_documents (document_id, demarche_id)
  select d.id, d.demarche_id
    from public.documents d
   where d.demarche_id = p_demarche_id
     and d.type_document not like 'admin\_%'
  on conflict (document_id) do update
     set statut = 'en_attente', tentatives = 0, erreur = null;

  get diagnostics v_nb = row_count;

  insert into public.controles_demarche (demarche_id, niveau, anomalies)
  values (p_demarche_id, 'en_attente', '[]'::jsonb)
  on conflict (demarche_id) do update
     set niveau = 'en_attente', calcule_le = now();

  perform net.http_post(
    url := 'https://oiotlgkfwuwshpwraneb.supabase.co/functions/v1/controle-dossiers',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := jsonb_build_object('demarche_id', p_demarche_id, 'lot', 40)
  );

  return v_nb;
end;
$$;

grant execute on function public.relancer_controle_dossier(uuid) to authenticated;
