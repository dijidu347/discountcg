-- Classer une conversation sans y répondre.
--
-- La première version de messages_en_attente() se fondait sur `is_read`. Mauvais
-- critère : ouvrir une conversation en tant qu'admin marque automatiquement les
-- messages comme lus, si bien qu'un dossier simplement consulté sortait de la
-- liste alors qu'on lui devait encore une réponse.
--
-- Le bon modèle a trois états, et `is_read` n'en distingue que le premier :
--   1. non lu          — on ne l'a pas encore ouvert
--   2. à répondre      — lu, mais le dernier mot est à eux
--   3. traité          — on a répondu, ou la conversation n'appelle pas de réponse
--
-- Le troisième cas a besoin d'être stocké : d'où cette table. Le classement
-- porte une date, et la conversation ressort si un nouveau message arrive
-- après — sans quoi un dossier classé une fois disparaîtrait pour toujours.

create table if not exists public.conversations_classees (
  source text not null check (source in ('pro', 'particulier')),
  cible_id uuid not null,
  classee_le timestamptz not null default now(),
  classee_par uuid references auth.users(id) on delete set null,
  primary key (source, cible_id)
);

comment on table public.conversations_classees is
  'Conversations marquées « pas de réponse nécessaire ». Le classement vaut jusqu''au prochain message reçu, qui les fait ressortir.';

alter table public.conversations_classees enable row level security;

drop policy if exists "Les admins gerent le classement" on public.conversations_classees;
create policy "Les admins gerent le classement"
  on public.conversations_classees
  for all
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

create or replace function public.messages_en_attente()
returns table (
  source text,
  cible_id uuid,
  reference text,
  dernier_message text,
  recu_le timestamptz,
  non_lu boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with dernier_pro as (
    select distinct on (m.demarche_id)
           m.demarche_id, m.sender_type, m.content, m.created_at, m.is_read
    from messages m
    order by m.demarche_id, m.created_at desc
  ),
  dernier_part as (
    select distinct on (gm.order_id)
           gm.order_id, gm.sender_type, gm.content, gm.created_at, gm.is_read
    from guest_order_messages gm
    order by gm.order_id, gm.created_at desc
  )
  select 'pro'::text,
         d.demarche_id,
         coalesce(de.numero_demarche, left(d.demarche_id::text, 8)),
         left(d.content, 120),
         d.created_at,
         not d.is_read
  from dernier_pro d
  join demarches de on de.id = d.demarche_id
  where d.sender_type <> 'admin'
    and de.status not in ('finalise', 'refuse')
    and not exists (
      select 1 from conversations_classees c
      where c.source = 'pro' and c.cible_id = d.demarche_id
        and c.classee_le >= d.created_at
    )

  union all

  select 'particulier'::text,
         g.order_id,
         coalesce(o.tracking_number, left(g.order_id::text, 8)),
         left(g.content, 120),
         g.created_at,
         not g.is_read
  from dernier_part g
  join guest_orders o on o.id = g.order_id
  where g.sender_type <> 'admin'
    and coalesce(o.status, '') <> 'termine'
    and not exists (
      select 1 from conversations_classees c
      where c.source = 'particulier' and c.cible_id = g.order_id
        and c.classee_le >= g.created_at
    )

  -- Par position : dans un UNION, le nom declare en sortie de fonction
  -- n'est pas visible ici. Les non lus d'abord, puis du plus recent au plus ancien.
  order by 6 desc, 5 desc;
$$;

revoke all on function public.messages_en_attente() from public, anon;
grant execute on function public.messages_en_attente() to authenticated;

comment on function public.messages_en_attente() is
  'Conversations dont le dernier message vient du garage ou du client, sur un dossier encore ouvert, et qui n''ont pas été classées depuis. Le drapeau non_lu distingue celles qu''on n''a pas encore ouvertes.';
