-- Le revenu net, et les volumes de démarches, pour la carte « Revenus » du
-- tableau de bord.
--
-- Cette carte affichait un revenu brut : la taxe reversée à l'État sur les
-- démarches pro (CPI WW, W garage, duplicata...) n'est mémorisée nulle part en
-- base, elle était donc comptée en revenu. La page /admin/revenus la déduit
-- depuis le navigateur : les deux pages annonçaient deux montants différents
-- pour la même période.
--
-- Le calcul est refait ici, à l'identique, mais en base : aucune ligne de
-- paiement ne transite, donc le plafond de 1000 lignes de PostgREST ne peut
-- pas tronquer le total.

-- Taxe forfaitaire reversée à l'État, par type de démarche pro. Jumelle de
-- TAXE_PAR_TYPE dans src/lib/taxeEtat.ts : une modification se porte des deux
-- côtés.
create or replace function public.taxe_etat_pro(p_type text)
returns numeric
language sql
immutable
set search_path to 'public'
as $$
  select (case p_type
    -- Taxe fixe seule : le CPI WW ne donne lieu à aucun envoi de titre.
    when 'WW_PROVISOIRE_PRO' then 11.00
    -- Taxe fixe et acheminement : un titre est édité et expédié.
    when 'W_GARAGE_PRO' then 13.76
    when 'DUPLICATA_CG_PRO' then 13.76
    when 'MODIF_CG_PRO' then 13.76
    -- Acheminement seul : la taxe fixe n'est pas due.
    when 'CHANGEMENT_ADRESSE_PRO' then 2.76
    when 'CHANGEMENT_ADRESSE_LOCATAIRE_PRO' then 2.76
    -- Les démarches sans taxe, et celles dont la taxe est variable et non
    -- mémorisée (immatriculation définitive, succession...) : rien à déduire
    -- ici. La page détaillée signale les secondes à l'écran.
    else 0
  end)::numeric;
$$;

comment on function public.taxe_etat_pro(text) is
  'Taxe forfaitaire reversée à l''État pour une démarche pro. Jumelle de TAXE_PAR_TYPE (src/lib/taxeEtat.ts).';

-- Le type de retour change : « create or replace » ne suffit pas.
drop function if exists public.stats_revenu_net(timestamptz, timestamptz);

create or replace function public.stats_revenu_net(
  p_du timestamptz,
  p_au timestamptz default now()
)
returns table(
  revenu_net numeric,
  demarches_recues integer,
  demarches_traitees integer,
  demarches_creees integer
)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Accès refusé : administrateur requis' using errcode = '42501';
  end if;

  return query
  with paie as (
    select p.montant, p.created_at, p.frais_bancaires,
           d.paid_with_tokens, d.is_free_token, d.frais_dossier,
           d.montant_ttc, d.prix_carte_grise, d.type::text as dtype,
           -- Le rang se calcule sur tous les paiements de la démarche, pas sur
           -- ceux de la période : un paiement partagé à cheval sur deux
           -- périodes ne doit pas devenir « premier » une seconde fois.
           row_number() over (partition by p.demarche_id order by p.created_at, p.id) as rang
      from paiements p
      join demarches d on d.id = p.demarche_id
     where p.status = 'valide'
  ),
  pro as (
    select
      coalesce(sum(
        case
          when paid_with_tokens or is_free_token then 0
          -- Carte grise : la taxe est mémorisée au dossier. Le paiement
          -- partagé produit deux encaissements, les frais ne se comptent
          -- qu'une fois.
          when dtype in ('CG', 'CG_DA', 'CG_IMPORT') then
            case
              when rang > 1 then 0
              when coalesce(montant_ttc, 0) > 0
                then greatest(0, montant_ttc - coalesce(prix_carte_grise, 0))
              else coalesce(nullif(frais_dossier, 0), 20)
            end
          else greatest(0, montant - public.taxe_etat_pro(dtype))
        end
      ), 0) as frais_service,
      -- La banque prélève sur tout ce qui est encaissé, y compris la part de
      -- taxe payée par le client en paiement partagé, qui ne rapporte rien.
      coalesce(sum(coalesce(frais_bancaires, 0)), 0) as frais_banque
      from paie
     where created_at >= p_du and created_at < p_au
  ),
  jetons as (
    select coalesce(sum(amount), 0) as revenu,
           coalesce(sum(coalesce(frais_bancaires, 0)), 0) as frais_banque
      from token_purchases
     where created_at >= p_du and created_at < p_au
  ),
  -- Commande particulier : seule la marge revient à l'entreprise, le HT porte
  -- les taxes de carte grise reversées à l'État.
  particuliers as (
    select coalesce(sum(greatest(0, coalesce(montant_ttc, 0) - coalesce(montant_ht, 0))), 0) as revenu,
           coalesce(sum(coalesce(frais_bancaires, 0)), 0) as frais_banque
      from guest_orders
     where paye
       and coalesce(paid_at, created_at) >= p_du
       and coalesce(paid_at, created_at) < p_au
  ),
  -- Reçues et traitées, même définition que stats_demarches_par_type : une
  -- démarche réglée, datée de son paiement, et une démarche finalisée.
  volumes as (
    select
      count(*) filter (where recue_le >= p_du and recue_le < p_au)::int as recues,
      count(*) filter (where finalise_at >= p_du and finalise_at < p_au)::int as traitees
      from (
        select coalesce(
                 (select min(p.created_at) from paiements p
                   where p.demarche_id = d.id and p.status = 'valide'),
                 d.client_paid_at, d.created_at) as recue_le,
               d.finalise_at
          from demarches d
         where not d.is_draft
           and (d.paye or d.paid_with_tokens or d.client_paid or d.is_free_token)
        union all
        select coalesce(o.paid_at, o.created_at), o.finalise_at
          from guest_orders o
         where o.paye
      ) tout
  ),
  -- Démarches ouvertes sur la période, réglées ou non : le haut de l'entonnoir.
  creees as (
    select count(*)::int as nombre
      from demarches d
     where not d.is_draft
       and d.created_at >= p_du and d.created_at < p_au
  )
  select round(pro.frais_service + jetons.revenu + particuliers.revenu
               - pro.frais_banque - jetons.frais_banque - particuliers.frais_banque, 2),
         volumes.recues,
         volumes.traitees,
         creees.nombre
    from pro, jetons, particuliers, volumes, creees;
end;
$function$;

comment on function public.stats_revenu_net(timestamptz, timestamptz) is
  'Revenu net (taxes de l''État et frais bancaires déduits) et volumes de démarches reçues/traitées sur une période. Même calcul que /admin/revenus.';

grant execute on function public.stats_revenu_net(timestamptz, timestamptz) to authenticated;
