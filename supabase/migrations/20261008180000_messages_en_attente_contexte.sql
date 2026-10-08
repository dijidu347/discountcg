-- Les conversations, avec leur état et de quoi les afficher.
--
-- Deux changements par rapport à la version précédente.
--
-- D'abord la fonction ne filtre plus : elle classe. La page dédiée montre trois
-- sections — non lues, à répondre, traitées — et les traitées étaient
-- justement celles que la version précédente écartait. L'état se lit ainsi :
--   non_lu     : le dernier mot est à eux, et nous ne l'avons pas ouvert
--   a_repondre : le dernier mot est à eux, nous l'avons lu, rien n'est parti
--   traite     : nous avons répondu, ou la conversation a été classée
--
-- Ensuite elle renvoie le contexte d'affichage : le garage et ses coordonnées
-- côté professionnel, le client et le numéro de suivi côté particulier. Sans
-- cela la page devait interroger la base à chaque conversation ouverte.
--
-- Les traitées sont plafonnées aux cent plus récentes : il y en a cent
-- cinquante-quatre sur les dossiers ouverts, et c'est une section de
-- consultation, pas une file de travail.

drop function if exists public.messages_en_attente();

create function public.messages_en_attente()
returns table (
  source text,
  cible_id uuid,
  reference text,
  dernier_message text,
  recu_le timestamptz,
  etat text,
  garage_id uuid,
  contact_email text,
  contact_nom text
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
  ),
  toutes as (
    select 'pro'::text as source,
           d.demarche_id as cible_id,
           coalesce(de.numero_demarche, left(d.demarche_id::text, 8)) as reference,
           left(d.content, 120) as dernier_message,
           d.created_at as recu_le,
           d.sender_type,
           d.is_read,
           de.garage_id,
           g.email as contact_email,
           g.raison_sociale as contact_nom
    from dernier_pro d
    join demarches de on de.id = d.demarche_id
    left join garages g on g.id = de.garage_id
    where de.status not in ('finalise', 'refuse')

    union all

    select 'particulier'::text,
           g.order_id,
           coalesce(o.tracking_number, left(g.order_id::text, 8)),
           left(g.content, 120),
           g.created_at,
           g.sender_type,
           g.is_read,
           null::uuid,
           o.email,
           nullif(trim(coalesce(o.prenom, '') || ' ' || coalesce(o.nom, '')), '')
    from dernier_part g
    join guest_orders o on o.id = g.order_id
    where coalesce(o.status, '') <> 'termine'
  ),
  qualifiees as (
    select t.*,
           case
             when t.sender_type = 'admin' then 'traite'
             when exists (
               select 1 from conversations_classees c
               where c.source = t.source and c.cible_id = t.cible_id
                 and c.classee_le >= t.recu_le
             ) then 'traite'
             when not t.is_read then 'non_lu'
             else 'a_repondre'
           end as etat
    from toutes t
  )
  select source, cible_id, reference, dernier_message, recu_le, etat,
         garage_id, contact_email, contact_nom
  from qualifiees
  where etat <> 'traite'

  union all

  -- Section de consultation : les cent plus recentes suffisent.
  select source, cible_id, reference, dernier_message, recu_le, etat,
         garage_id, contact_email, contact_nom
  from (
    select * from qualifiees where etat = 'traite'
    order by recu_le desc
    limit 100
  ) recentes

  order by 5 desc;
$$;

revoke all on function public.messages_en_attente() from public, anon;
grant execute on function public.messages_en_attente() to authenticated;

comment on function public.messages_en_attente() is
  'Conversations des dossiers ouverts, qualifiées en non_lu, a_repondre ou traite, avec de quoi les afficher. Les traitées sont plafonnées aux cent plus récentes.';
