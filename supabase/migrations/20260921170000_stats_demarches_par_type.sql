-- Statistiques « démarches reçues / traitées » par type, sur une période.
--
-- Il n'existait aucune date de traitement fiable (validated_at presque
-- toujours vide). On ajoute finalise_at, posée automatiquement quand le
-- dossier passe en « finalise », et on remplit l'historique au plus juste :
--   pro         : dépôt du premier document admin (le document final remis),
--                 à défaut la dernière mise à jour ;
--   particulier : dernière mise à jour.

alter table public.demarches add column if not exists finalise_at timestamptz;
alter table public.guest_orders add column if not exists finalise_at timestamptz;

create or replace function public.poser_finalise_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status::text = 'finalise' and (tg_op = 'INSERT' or old.status::text is distinct from 'finalise') then
    new.finalise_at := coalesce(new.finalise_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists poser_finalise_at on public.demarches;
create trigger poser_finalise_at before insert or update of status on public.demarches
  for each row execute function public.poser_finalise_at();
drop trigger if exists poser_finalise_at on public.guest_orders;
create trigger poser_finalise_at before insert or update of status on public.guest_orders
  for each row execute function public.poser_finalise_at();

-- Remplissage de l'historique, sans toucher à updated_at ni déclencher les
-- verrous (réplication : les déclencheurs ne tournent pas).
do $$
begin
  set local session_replication_role = replica;
  update public.demarches d
     set finalise_at = coalesce(
           (select min(x.created_at) from public.documents x
             where x.demarche_id = d.id and x.type_document like 'admin\_%'),
           d.updated_at)
   where d.status = 'finalise' and d.finalise_at is null;
  update public.guest_orders o
     set finalise_at = o.updated_at
   where o.status = 'finalise' and o.finalise_at is null;
end $$;

create index if not exists demarches_finalise_at_idx on public.demarches (finalise_at);

-- Reçues : démarches réglées (carte, jetons, client ou offerte), datées du
-- premier paiement carte, sinon du paiement client, sinon de la création.
-- Traitées : passées en « finalise » sur la période.
create or replace function public.stats_demarches_par_type(p_du timestamptz, p_au timestamptz)
returns table (source text, type text, titre text, recues integer, traitees integer)
language sql
stable
security definer
set search_path = public
as $$
  with pro as (
    select d.type::text t,
           coalesce((select min(p.created_at) from paiements p where p.demarche_id = d.id and p.status = 'valide'),
                    d.client_paid_at, d.created_at) recue_le,
           d.finalise_at
      from demarches d
     where not d.is_draft and (d.paye or d.paid_with_tokens or d.client_paid or d.is_free_token)
  ),
  part as (
    select o.demarche_type t, coalesce(o.paid_at, o.created_at) recue_le, o.finalise_at
      from guest_orders o where o.paye
  ),
  tout as (
    select 'pro' s, t, recue_le, finalise_at from pro
    union all
    select 'particulier', t, recue_le, finalise_at from part
  )
  select s, t,
         coalesce(case when s = 'pro' then (select a.titre from actions_rapides a where a.code = t limit 1)
                       else (select g.titre from guest_demarche_types g where g.code = t limit 1) end, t),
         count(*) filter (where recue_le >= p_du and recue_le < p_au)::int,
         count(*) filter (where finalise_at >= p_du and finalise_at < p_au)::int
    from tout
   where public.has_role(auth.uid(), 'admin'::public.app_role)
   group by s, t
  having count(*) filter (where recue_le >= p_du and recue_le < p_au) > 0
      or count(*) filter (where finalise_at >= p_du and finalise_at < p_au) > 0
   order by 4 desc, 5 desc;
$$;

revoke all on function public.stats_demarches_par_type(timestamptz, timestamptz) from public, anon;
grant execute on function public.stats_demarches_par_type(timestamptz, timestamptz) to authenticated, service_role;
