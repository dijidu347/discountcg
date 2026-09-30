-- Réclamer une pièce sans refuser celles qui sont bonnes.
--
-- Jusqu'ici, refuser une pièce était la seule action qui prévenait le garage,
-- lui envoyait un e-mail et remettait le dossier en attente du client. Pour
-- réclamer une pièce absente, l'administration refusait donc une pièce valide,
-- souvent le mandat ou la carte d'identité. Le garage recevait « votre mandat
-- est refusé » et le renvoyait à l'identique : un aller-retour perdu.
--
-- Sur 24 pièces refusées examinées le 30/09/2026, 10 n'avaient aucun défaut :
-- elles servaient à dire qu'une autre pièce manquait. Ces faux refus faussent
-- aussi le contrôle automatique, qui apprend qu'une pièce correcte est mauvaise.

create table if not exists public.pieces_demandees (
  id uuid primary key default gen_random_uuid(),
  demarche_id uuid not null references public.demarches(id) on delete cascade,
  libelle text not null,
  motif text,
  demandee_le timestamptz not null default now(),
  demandee_par uuid,
  -- La pièce déposée en réponse, et la date : une demande sans réponse est ce
  -- qu'on relance.
  document_id uuid references public.documents(id) on delete set null,
  fournie_le timestamptz,
  annulee_le timestamptz
);

create index if not exists pieces_demandees_demarche on public.pieces_demandees (demarche_id);
create index if not exists pieces_demandees_en_attente
  on public.pieces_demandees (demandee_le)
  where fournie_le is null and annulee_le is null;

alter table public.pieces_demandees enable row level security;

drop policy if exists "Admins gerent les demandes" on public.pieces_demandees;
create policy "Admins gerent les demandes" on public.pieces_demandees
  for all using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

-- Le garage voit ce qu'on lui réclame sur ses propres dossiers, sans pouvoir
-- le modifier : il y répond en déposant la pièce.
drop policy if exists "Garages voient leurs demandes" on public.pieces_demandees;
create policy "Garages voient leurs demandes" on public.pieces_demandees
  for select using (
    demarche_id in (
      select d.id from public.demarches d
      join public.garages g on g.id = d.garage_id
      where g.user_id = auth.uid()
    )
  );

create or replace function public.demander_piece(
  p_demarche_id uuid,
  p_libelle text,
  p_motif text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_garage uuid;
  v_immat text;
begin
  if not has_role(auth.uid(), 'admin'::app_role) then
    raise exception 'Réservé aux administrateurs';
  end if;
  if coalesce(trim(p_libelle), '') = '' then
    raise exception 'Il faut nommer la pièce demandée';
  end if;

  select d.garage_id, d.immatriculation into v_garage, v_immat
    from public.demarches d where d.id = p_demarche_id;
  if v_garage is null then
    raise exception 'Démarche introuvable';
  end if;

  insert into public.pieces_demandees (demarche_id, libelle, motif, demandee_par)
  values (p_demarche_id, trim(p_libelle), nullif(trim(coalesce(p_motif, '')), ''), auth.uid())
  returning id into v_id;

  insert into public.notifications (garage_id, demarche_id, type, message, created_by)
  values (
    v_garage,
    p_demarche_id,
    'piece_demandee',
    'Une pièce vous est demandée pour la démarche ' || coalesce(v_immat, '') || ' : ' || trim(p_libelle),
    auth.uid()
  );

  return v_id;
end;
$$;

grant execute on function public.demander_piece(uuid, text, text) to authenticated;

create or replace function public.annuler_piece_demandee(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not has_role(auth.uid(), 'admin'::app_role) then
    raise exception 'Réservé aux administrateurs';
  end if;
  update public.pieces_demandees set annulee_le = now()
   where id = p_id and fournie_le is null;
end;
$$;

grant execute on function public.annuler_piece_demandee(uuid) to authenticated;

-- Le dépôt répond tout seul à la demande : l'emplacement d'envoi porte
-- l'identifiant de celle-ci, il n'y a rien à rapprocher à la main.
create or replace function public.lier_piece_demandee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.type_document like 'demande\_%' then
    update public.pieces_demandees
       set document_id = new.id, fournie_le = now()
     where demarche_id = new.demarche_id
       and replace(id::text, '-', '') = substring(new.type_document from 9)
       and fournie_le is null;
  end if;
  return new;
end;
$$;

drop trigger if exists documents_lier_demande on public.documents;
create trigger documents_lier_demande
  after insert on public.documents
  for each row execute function public.lier_piece_demandee();
