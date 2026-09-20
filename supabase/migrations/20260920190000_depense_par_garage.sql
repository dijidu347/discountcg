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
