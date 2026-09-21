-- Relance des dossiers en sommeil : « il nous manque vos pièces ».
--
-- Un dossier réglé, déjà ouvert par l'admin, dont le client n'a déposé aucune
-- pièce ni écrit depuis 30 jours reçoit un mail, puis un dernier à 60 jours.
-- Seulement si c'est bien au client d'agir : aucune pièce déposée, ou une pièce
-- refusée pas encore remplacée (jamais quand les pièces attendent l'admin).
-- Seuls les dossiers qui s'endorment après la mise en service sont relancés.
-- Les documents déposés par l'admin (admin_document_*) ne comptent pas.

alter table public.demarches
  add column if not exists relances_sommeil integer not null default 0,
  add column if not exists derniere_relance_sommeil_at timestamptz;
alter table public.guest_orders
  add column if not exists relances_sommeil integer not null default 0,
  add column if not exists derniere_relance_sommeil_at timestamptz;

drop function if exists public.dossiers_sommeil_a_relancer(timestamptz);
create function public.dossiers_sommeil_a_relancer(p_mise_en_service timestamptz)
returns table (
  source text, dossier_id uuid, email text, nom text, reference text, demarche text,
  immatriculation text, pieces jsonb, numero_relance integer
)
language sql
stable
security definer
set search_path = public
as $$
  with pro as (
    select d.id, d.created_at, d.numero_demarche, d.type::text as t, d.immatriculation,
           d.relances_sommeil, d.derniere_relance_sommeil_at, g.email, g.raison_sociale
      from demarches d join garages g on g.id = d.garage_id
     where not d.is_draft and d.admin_viewed is true
       and (d.paye or d.paid_with_tokens or d.client_paid or d.is_free_token)
       and d.status::text not in ('finalise', 'refuse', 'en_attente_paiement_client', 'en_attente_paiement_pro')
       and d.relances_sommeil < 2
  ),
  pro_docs as (
    select x.demarche_id, count(*) n, max(x.created_at) dernier_depot
      from documents x where x.demarche_id in (select id from pro) and x.type_document not like 'admin\_%' group by x.demarche_id
  ),
  pro_refus as (
    -- doc_<rang> désigne la pièce de ce rang dans la liste de la démarche.
    select dernier.demarche_id,
           jsonb_agg(jsonb_build_object(
             'piece', coalesce(
               case when dernier.type_document ~ '^doc_\d+' then (select ad.nom_document from action_documents ad join actions_rapides a on a.id = ad.action_id
                 where a.code = p.t order by ad.ordre
                offset greatest((substring(dernier.type_document from '^doc_(\d+)'))::int - 1, 0) limit 1) end
               || case when dernier.type_document like '%\_verso' then ' (verso)' else '' end,
               case when dernier.type_document like 'autre\_piece%' then coalesce(dernier.document_type, 'Pièce complémentaire') end,
               dernier.type_document),
             'motif', dernier.validation_comment)) refus
      from (select distinct on (x.demarche_id, x.type_document) x.demarche_id, x.type_document, x.document_type, x.validation_status, x.validation_comment
              from documents x where x.demarche_id in (select id from pro) and x.type_document not like 'admin\_%'
             order by x.demarche_id, x.type_document, x.created_at desc) dernier
      join pro p on p.id = dernier.demarche_id
     where dernier.validation_status = 'rejected'
     group by dernier.demarche_id
  ),
  pro_msg as (
    select m.demarche_id, max(m.created_at) dernier from messages m
     where m.demarche_id in (select id from pro) and m.sender_type <> 'admin' group by m.demarche_id
  ),
  pro_etat as (
    select p.*, greatest(p.created_at, coalesce(pd.dernier_depot, p.created_at), coalesce(pm.dernier, p.created_at)) activite,
           coalesce(pd.n, 0) nb_pieces, pr.refus
      from pro p left join pro_docs pd on pd.demarche_id = p.id
      left join pro_refus pr on pr.demarche_id = p.id
      left join pro_msg pm on pm.demarche_id = p.id
  ),
  part as (
    select o.id, coalesce(o.paid_at, o.created_at) base, o.tracking_number, o.demarche_type, o.immatriculation,
           o.relances_sommeil, o.derniere_relance_sommeil_at, o.email, o.prenom
      from guest_orders o
     where o.paye and o.admin_viewed is true
       and coalesce(o.status, '') not in ('finalise', 'refuse')
       and o.relances_sommeil < 2
  ),
  part_docs as (
    select x.order_id, count(*) n, max(x.created_at) dernier_depot
      from guest_order_documents x where x.order_id in (select id from part) group by x.order_id
  ),
  part_refus as (
    select order_id, jsonb_agg(jsonb_build_object('piece', type_document, 'motif', rejection_reason)) refus
      from (select distinct on (x.order_id, x.type_document) x.order_id, x.type_document, x.validation_status, x.rejection_reason
              from guest_order_documents x where x.order_id in (select id from part)
             order by x.order_id, x.type_document, x.created_at desc) dernier
     where validation_status = 'rejected'
     group by order_id
  ),
  part_msg as (
    select m.order_id, max(m.created_at) dernier from guest_order_messages m
     where m.order_id in (select id from part) and m.sender_type <> 'admin' group by m.order_id
  ),
  part_etat as (
    select p.*, greatest(p.base, coalesce(pd.dernier_depot, p.base), coalesce(pm.dernier, p.base)) activite,
           coalesce(pd.n, 0) nb_pieces, pr.refus
      from part p left join part_docs pd on pd.order_id = p.id
      left join part_refus pr on pr.order_id = p.id
      left join part_msg pm on pm.order_id = p.id
  )
  select 'pro', e.id, e.email, e.raison_sociale, e.numero_demarche,
         coalesce((select a.titre from actions_rapides a where a.code = e.t), e.t),
         nullif(e.immatriculation, 'TEMP'), coalesce(e.refus, '[]'::jsonb), e.relances_sommeil + 1
    from pro_etat e
   where (e.nb_pieces = 0 or e.refus is not null)
     and ((e.relances_sommeil = 0 and e.activite < now() - interval '30 days' and e.activite > p_mise_en_service - interval '30 days')
       or (e.relances_sommeil = 1 and e.activite < now() - interval '60 days' and e.derniere_relance_sommeil_at < now() - interval '25 days'))
  union all
  select 'particulier', e.id, e.email, e.prenom, e.tracking_number,
         coalesce((select t.titre from guest_demarche_types t where t.code = e.demarche_type), e.demarche_type),
         e.immatriculation, coalesce(e.refus, '[]'::jsonb), e.relances_sommeil + 1
    from part_etat e
   where (e.nb_pieces = 0 or e.refus is not null)
     and ((e.relances_sommeil = 0 and e.activite < now() - interval '30 days' and e.activite > p_mise_en_service - interval '30 days')
       or (e.relances_sommeil = 1 and e.activite < now() - interval '60 days' and e.derniere_relance_sommeil_at < now() - interval '25 days'));
$$;

revoke all on function public.dossiers_sommeil_a_relancer(timestamptz) from public, anon, authenticated;
grant execute on function public.dossiers_sommeil_a_relancer(timestamptz) to service_role;

-- Tous les jours à 8h17 (UTC).
select cron.schedule(
  'relance-dossiers-sommeil',
  '17 8 * * *',
  $$
  select net.http_post(
    url := 'https://oiotlgkfwuwshpwraneb.supabase.co/functions/v1/relance-dossiers-sommeil',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)
    ),
    body := jsonb_build_object('action', 'relancer')
  );
  $$
);
