-- L'encart « note interne » d'une démarche.
--
-- Une seule note par démarche, qu'on modifie plutôt que d'en empiler : la
-- demande est de savoir ce qui a été dit ou décidé sur CE dossier, pas d'en
-- tenir un journal. D'où la clé primaire sur `demarche_id`.
--
-- Elle n'est PAS une colonne de `demarches`, et c'est le point important : le
-- garage lit cette table (politique « Garages can view their own demarches »),
-- il verrait donc la note. Une table à part, fermée aux administrateurs, est la
-- seule façon de tenir la promesse du mot « interne ».
--
-- `updated_at` reste nul tant qu'on n'a pas modifié la note : c'est ce qui
-- permet à l'écran d'écrire « Ajouté le… » la première fois, puis
-- « Modifié le… ». Le déclencheur protège aussi `created_at`, qu'un upsert
-- écraserait sinon à chaque enregistrement.

create table if not exists public.notes_demarche (
  demarche_id uuid primary key references public.demarches(id) on delete cascade,
  contenu     text not null,
  auteur_id   uuid not null,
  auteur      text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

alter table public.notes_demarche enable row level security;

create policy "Admins lisent les notes internes" on public.notes_demarche
  for select using (has_role(auth.uid(), 'admin'::app_role));

create policy "Admins écrivent les notes internes" on public.notes_demarche
  for insert with check (has_role(auth.uid(), 'admin'::app_role) and auteur_id = auth.uid());

create policy "Admins modifient les notes internes" on public.notes_demarche
  for update using (has_role(auth.uid(), 'admin'::app_role));

create policy "Admins suppriment les notes internes" on public.notes_demarche
  for delete using (has_role(auth.uid(), 'admin'::app_role));

create or replace function public.notes_demarche_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  new.created_at = old.created_at;
  return new;
end; $$;

drop trigger if exists notes_demarche_maj on public.notes_demarche;
create trigger notes_demarche_maj before update on public.notes_demarche
  for each row execute function public.notes_demarche_touch();
