-- La pastille « commandes particulier à traiter » comptait les dossiers qui
-- dorment : ouverts par l'administration, et sans aucune nouvelle du client
-- depuis plus de 30 jours — ni pièce déposée, ni message. Elle annonçait 23
-- dossiers quand 10 seulement attendaient vraiment un geste.
--
-- La règle est celle de l'onglet « En sommeil » de la page Commandes
-- particulier, écrite ici pour que la pastille et la liste ne se contredisent
-- jamais.

create or replace function public.commandes_particulier_actives()
returns integer
language sql
stable
security definer
set search_path to 'public'
as $function$
  select count(*)::int
    from public.guest_orders o
   where public.has_role(auth.uid(), 'admin')
     and o.paye
     and (o.status is null or o.status not in ('finalise', 'refuse'))
     and not (
       o.admin_viewed is true
       and greatest(
             coalesce(o.paid_at, o.created_at),
             coalesce((select max(d.created_at) from public.guest_order_documents d where d.order_id = o.id), 'epoch'::timestamptz),
             coalesce((select max(m.created_at) from public.guest_order_messages m where m.order_id = o.id), 'epoch'::timestamptz)
           ) < now() - interval '30 days'
     );
$function$;

grant execute on function public.commandes_particulier_actives() to authenticated;
