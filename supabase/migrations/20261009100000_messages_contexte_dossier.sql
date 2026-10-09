-- Le contexte du dossier, pour répondre sans le quitter.
--
-- Jusqu'ici la page des messages n'affichait que la référence et l'adresse de
-- l'interlocuteur. Pour répondre utilement il faut savoir de quelle démarche on
-- parle, où elle en est, ce qu'elle coûte et depuis quand elle attend — ce qui
-- obligeait à ouvrir le dossier complet dans une autre page, donc à perdre le
-- fil de la conversation.

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
  contact_nom text,
  demarche_libelle text,
  dossier_statut text,
  dossier_montant numeric,
  dossier_depuis timestamptz
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
           g.raison_sociale as contact_nom,
           coalesce(a.titre, de.type::text) as demarche_libelle,
           de.status::text as dossier_statut,
           de.montant_ttc as dossier_montant,
           de.created_at as dossier_depuis
    from dernier_pro d
    join demarches de on de.id = d.demarche_id
    left join garages g on g.id = de.garage_id
    left join actions_rapides a on a.code = de.type::text
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
           nullif(trim(coalesce(o.prenom, '') || ' ' || coalesce(o.nom, '')), ''),
           coalesce(t.titre, o.demarche_type),
           nullif(o.status, ''),
           o.montant_ttc,
           o.created_at
    from dernier_part g
    join guest_orders o on o.id = g.order_id
    left join guest_demarche_types t on t.code = o.demarche_type
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
         garage_id, contact_email, contact_nom,
         demarche_libelle, dossier_statut, dossier_montant, dossier_depuis
  from qualifiees
  where etat <> 'traite'
  order by recu_le desc;
$$;

revoke all on function public.messages_en_attente() from public, anon;
grant execute on function public.messages_en_attente() to authenticated;

comment on function public.messages_en_attente() is
  'Conversations des dossiers ouverts attendant une réponse, qualifiées en non_lu ou a_repondre, avec de quoi afficher la conversation et le contexte du dossier.';
