-- Dépense totale d'un garage, pour la liste admin des garages.
--
-- Additionner cote navigateur etait impossible : les paiements (2000 lignes) et
-- les achats de jetons depassent le plafond de 1000 lignes par requete. Le
-- calcul se fait donc en base, et seuls les administrateurs obtiennent des
-- lignes (la fonction n'en renvoie aucune aux autres).
--
-- Definition : paiements carte du garage (hors demarches reglees avec le solde,
-- deja payees au moment de l'achat des jetons) + achats de jetons.

create or replace function public.depense_par_garage()
returns table(garage_id uuid, total numeric)
language sql
stable
security definer
set search_path = public
as $$
  select g.id,
    coalesce((select sum(p.montant) from paiements p
               left join demarches d on d.id = p.demarche_id
              where p.garage_id = g.id and p.status = 'valide' and p.payer_type = 'pro'
                and coalesce(d.paid_with_tokens, false) = false), 0)
  + coalesce((select sum(t.amount) from token_purchases t where t.garage_id = g.id), 0)
  from garages g
  where public.has_role(auth.uid(), 'admin'::public.app_role);
$$;

revoke all on function public.depense_par_garage() from public, anon;
grant execute on function public.depense_par_garage() to authenticated, service_role;

-- 21/09/2026 : ajout du nombre de demarches effectuees (payees, en jetons,
-- par le client ou offertes), pour trier la liste des garages. Calcul en une
-- passe (agregats groupes) : la version par sous-requetes prenait 1,6 s.
create index if not exists demarches_garage_id_idx on public.demarches (garage_id);
create index if not exists paiements_garage_id_idx on public.paiements (garage_id);
drop function if exists public.depense_par_garage();
create function public.depense_par_garage()
returns table(garage_id uuid, total numeric, nb_demarches integer)
language sql
stable
security definer
set search_path = public
as $$
  select g.id,
         coalesce(pa.total, 0) + coalesce(tk.total, 0),
         coalesce(dm.n, 0)::int
    from garages g
    left join (select p.garage_id, sum(p.montant) total
                 from paiements p left join demarches d on d.id = p.demarche_id
                where p.status = 'valide' and p.payer_type = 'pro' and coalesce(d.paid_with_tokens, false) = false
                group by p.garage_id) pa on pa.garage_id = g.id
    left join (select t.garage_id, sum(t.amount) total from token_purchases t group by t.garage_id) tk on tk.garage_id = g.id
    left join (select d.garage_id, count(*) n from demarches d
                where not d.is_draft and (d.paye or d.paid_with_tokens or d.client_paid or d.is_free_token)
                group by d.garage_id) dm on dm.garage_id = g.id
   where public.has_role(auth.uid(), 'admin'::public.app_role);
$$;
revoke all on function public.depense_par_garage() from public, anon;
grant execute on function public.depense_par_garage() to authenticated, service_role;
