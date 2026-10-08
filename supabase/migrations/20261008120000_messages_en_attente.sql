-- Les conversations qui attendent une réponse de notre part.
--
-- Remplace les e-mails d'alerte, qui partaient à chaque message reçu : trois
-- messages d'un client produisaient trois e-mails. Le chat professionnel avait
-- une déduplication — pas d'alerte si le message précédent venait du même
-- expéditeur depuis moins de deux heures — mais le chat des commandes
-- particulier n'en avait aucune, et c'est de là que venaient les rafales.
--
-- Trois conditions, parce que la première seule ne trie rien : sur l'ensemble
-- des conversations, 530 se terminent par un message d'en face, le plus
-- souvent un « merci » sur un dossier clos. En exigeant en plus que le message
-- soit non lu et la démarche encore ouverte, il en reste 25 — un nombre sur
-- lequel on peut agir.

create or replace function public.messages_en_attente()
returns table (
  source text,
  cible_id uuid,
  reference text,
  dernier_message text,
  recu_le timestamptz
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
         d.created_at
  from dernier_pro d
  join demarches de on de.id = d.demarche_id
  where d.sender_type <> 'admin'
    and not d.is_read
    and de.status not in ('finalise', 'refuse')

  union all

  select 'particulier'::text,
         g.order_id,
         coalesce(o.tracking_number, left(g.order_id::text, 8)),
         left(g.content, 120),
         g.created_at
  from dernier_part g
  join guest_orders o on o.id = g.order_id
  where g.sender_type <> 'admin'
    and not g.is_read
    and coalesce(o.status, '') <> 'termine'

  -- Par position : dans un UNION, le nom declare en sortie de fonction
  -- n'est pas visible ici.
  order by 5 desc;
$$;

revoke all on function public.messages_en_attente() from public, anon;
grant execute on function public.messages_en_attente() to authenticated;

comment on function public.messages_en_attente() is
  'Conversations dont le dernier message vient du garage ou du client, non lu, sur un dossier encore ouvert : celles qui attendent une réponse. Alimente la carte du tableau de bord admin, qui a remplacé les e-mails d''alerte.';
