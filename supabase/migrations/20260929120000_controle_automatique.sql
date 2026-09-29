-- Contrôle automatique des dossiers.
--
-- Chaque pièce déposée est lue une fois par un modèle de vision : on en extrait
-- ce qui permet de la recouper avec le reste du dossier (plaque, VIN, noms,
-- adresses, dates, signatures) et on note sa qualité (flou, tronqué, illisible).
-- Le dossier est ensuite contrôlé pièce par pièce, puis dans son ensemble.
--
-- Rien ne bloque le garage : le résultat s'affiche dans la fiche admin, trié par
-- gravité, pour que le contrôle manuel ne porte que sur ce qui est signalé.

create table if not exists public.analyses_documents (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  demarche_id uuid references public.demarches(id) on delete cascade,
  statut text not null default 'en_attente',
  modele text,
  piece_attendue text,
  type_detecte text,
  extraction jsonb not null default '{}'::jsonb,
  anomalies jsonb not null default '[]'::jsonb,
  -- Empreinte du fichier : deux pièces différentes qui portent la même empreinte
  -- sont le même fichier déposé deux fois, l'erreur de dépôt la plus courante.
  empreinte text,
  erreur text,
  tentatives integer not null default 0,
  cree_le timestamptz not null default now(),
  analyse_le timestamptz,
  constraint analyses_documents_statut_valide check (statut in ('en_attente', 'ok', 'erreur', 'ignore')),
  constraint analyses_documents_document_unique unique (document_id)
);

-- La file d'attente est lue à chaque passage du worker : l'index ne porte que
-- sur les lignes qui restent à traiter.
create index if not exists analyses_documents_file
  on public.analyses_documents (cree_le)
  where statut = 'en_attente';

create index if not exists analyses_documents_demarche
  on public.analyses_documents (demarche_id);

-- Synthèse par dossier : recalculée dès qu'une pièce vient d'être analysée.
create table if not exists public.controles_demarche (
  demarche_id uuid primary key references public.demarches(id) on delete cascade,
  niveau text not null default 'en_attente',
  anomalies jsonb not null default '[]'::jsonb,
  pieces_analysees integer not null default 0,
  pieces_attendues integer not null default 0,
  calcule_le timestamptz not null default now(),
  constraint controles_demarche_niveau_valide check (niveau in ('en_attente', 'vert', 'orange', 'rouge'))
);

create index if not exists controles_demarche_niveau on public.controles_demarche (niveau);

alter table public.analyses_documents enable row level security;
alter table public.controles_demarche enable row level security;

-- Lecture réservée aux admins : l'extraction contient des données personnelles
-- lues sur les pièces (noms, adresses, numéros de document).
drop policy if exists "Admins lisent les analyses" on public.analyses_documents;
create policy "Admins lisent les analyses" on public.analyses_documents
  for select using (has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "Admins lisent les controles" on public.controles_demarche;
create policy "Admins lisent les controles" on public.controles_demarche
  for select using (has_role(auth.uid(), 'admin'::app_role));

-- L'écriture passe uniquement par la fonction edge (clé de service), qui
-- contourne RLS : aucune policy d'écriture n'est ouverte ici.

-- Mise en file d'une pièce dès son dépôt.
--
-- Les pièces déposées par l'admin (la carte grise finalisée qu'on renvoie au
-- garage) n'ont rien à contrôler, et les brouillons non plus tant que le dossier
-- n'est pas envoyé : on ne paie pas de lecture pour rien.
create or replace function public.mettre_document_en_file()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.type_document like 'admin\_%' then
    return new;
  end if;

  insert into public.analyses_documents (document_id, demarche_id)
  values (new.id, new.demarche_id)
  on conflict (document_id) do nothing;

  return new;
end;
$$;

drop trigger if exists documents_mise_en_file on public.documents;
create trigger documents_mise_en_file
  after insert on public.documents
  for each row execute function public.mettre_document_en_file();

-- Remise en file d'un dossier entier, déclenchée par le bouton « Relancer le
-- contrôle » de la fiche admin. Réservée aux admins : c'est une dépense (une
-- lecture facturée par pièce).
create or replace function public.relancer_controle_dossier(p_demarche_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nb integer;
begin
  if not has_role(auth.uid(), 'admin'::app_role) then
    raise exception 'Réservé aux administrateurs';
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

  -- Sans cet appel, l'admin attendrait le prochain passage du cron : le dossier
  -- demandé passe devant.
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

-- Passage régulier : les pièces déposées entre deux passages sont lues, et les
-- dossiers concernés recontrôlés. Deux minutes suffisent très largement au
-- volume actuel (environ 200 pièces par jour).
select cron.schedule(
  'controle-dossiers',
  '*/2 * * * *',
  $cron$
  select net.http_post(
    url := 'https://oiotlgkfwuwshpwraneb.supabase.co/functions/v1/controle-dossiers',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $cron$
);
