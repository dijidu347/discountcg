-- Relance des démarches pro abandonnées avant paiement : « une question ? »
--
-- Il existait déjà deux relances, et aucune ne couvrait ce cas :
--   · relance-commandes-particulier  → commandes particulier non payées, J+1 et J+3 ;
--   · relance-dossiers-sommeil       → dossiers DÉJÀ PAYÉS dont les pièces manquent, 30 et 60 jours.
-- Entre les deux, le garage qui commence une démarche et ne va pas au bout
-- n'était relancé par personne. Mesuré le 18 octobre 2026 : 1 772 démarches
-- en saisie jamais réglées, dont 125 sur les sept derniers jours.
--
-- Pourquoi J+2 et non plus tôt : 82 % des démarches sont finalisées en moins
-- de deux jours. Un dossier encore en saisie et impayé à J+2 est donc bloqué,
-- pas en cours — relancer avant reviendrait à presser un client sur cinq qui
-- travaille normalement.
--
-- Pourquoi « vraiment commencé » : une démarche sans immatriculation ni pièce
-- est un clic, pas une intention. La relancer ferait du bruit pour rien.
--
-- Pourquoi jamais au-delà de 30 jours : passé ce délai le véhicule est vendu
-- ou la carte grise faite ailleurs. Le rappel arrive comme une maladresse.
--
-- Et rien d'antérieur à la mise en service : les 1 772 dossiers existants ne
-- sont pas relancés. Pas de mail surprise à des garages venus il y a des mois.

alter table public.demarches
  add column if not exists relances_abandon integer not null default 0,
  add column if not exists derniere_relance_abandon_at timestamptz;

drop function if exists public.demarches_abandonnees_a_relancer(timestamptz);
create function public.demarches_abandonnees_a_relancer(p_mise_en_service timestamptz)
returns table (
  dossier_id uuid, email text, nom text, reference text,
  demarche text, immatriculation text, numero_relance integer
)
language sql
stable
security definer
set search_path = public
as $$
  with candidats as (
    select d.id, d.created_at, d.numero_demarche, d.type::text as t,
           d.immatriculation, d.relances_abandon, d.derniere_relance_abandon_at,
           g.email, g.raison_sociale,
           (select count(*) from documents x
             where x.demarche_id = d.id
               and x.type_document not like 'admin\_%') as nb_pieces
      from demarches d
      join garages g on g.id = d.garage_id
     where d.status::text = 'en_saisie'
       and not (d.paye or d.paid_with_tokens or d.client_paid or d.is_free_token)
       and not d.is_draft
       and d.created_at > p_mise_en_service
       and d.created_at > now() - interval '30 days'
       and d.relances_abandon < 2
  )
  select c.id,
         c.email,
         c.raison_sociale,
         coalesce(c.numero_demarche, ''),
         coalesce((select a.titre from actions_rapides a where a.code = c.t), c.t),
         nullif(c.immatriculation, 'TEMP'),
         c.relances_abandon + 1
    from candidats c
   where ((c.immatriculation is not null and c.immatriculation <> '' and c.immatriculation <> 'TEMP')
          or c.nb_pieces > 0)
     and (
          (c.relances_abandon = 0 and c.created_at < now() - interval '2 days')
       or (c.relances_abandon = 1 and c.created_at < now() - interval '7 days'
           and c.derniere_relance_abandon_at < now() - interval '4 days')
     )
   order by c.created_at;
$$;

revoke all on function public.demarches_abandonnees_a_relancer(timestamptz) from public, anon, authenticated;
grant execute on function public.demarches_abandonnees_a_relancer(timestamptz) to service_role;
