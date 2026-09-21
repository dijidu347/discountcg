-- Les jetons paient les frais de service, jamais la taxe regionale.
--
-- Regle metier (21/09/2026) : la taxe de carte grise, reversee a l'Etat, se
-- paie uniquement par carte. Jusqu'ici, en mode « je paie tout », le solde
-- etait debite des frais ET de la taxe, alors que l'ecran annoncait un cout en
-- jetons limite aux frais.
--
-- Desormais : le solde paie les frais (dossier, options, express). S'il reste
-- une taxe, la demarche passe en « en_attente_paiement_pro » (payee en jetons,
-- pas encore payee) ; le garage regle la taxe par carte (create-sogecommerce-
-- payment, mode « taxe »), et le webhook de paiement la passe en payee.

create or replace function public.payer_demarche_avec_solde(
  p_demarche_id uuid,
  p_mode text default null,
  p_statut text default null,
  p_documents_complets boolean default false
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  d record;
  v_mode text;
  v_options numeric;
  v_express numeric;
  v_montant numeric;
  v_taxe numeric;
  v_solde numeric;
  v_non_gage text;
begin
  if v_uid is null then raise exception 'authentification requise'; end if;

  select dm.id, dm.type::text as t, dm.express, dm.paye, dm.paid_with_tokens, dm.payment_mode,
         dm.frais_dossier, dm.prix_carte_grise, g.id as garage_id, g.user_id
    into d
    from demarches dm join garages g on g.id = dm.garage_id
   where dm.id = p_demarche_id;
  if not found then raise exception 'démarche introuvable'; end if;
  if d.user_id <> v_uid and not public.has_role(v_uid, 'admin'::public.app_role) then
    raise exception 'non autorisé';
  end if;
  if d.paye or coalesce(d.paid_with_tokens, false) then raise exception 'démarche déjà payée'; end if;

  if not public.has_role(v_uid, 'admin'::public.app_role) then
    v_non_gage := public.verifier_non_gage(p_demarche_id);
    if v_non_gage is not null then raise exception '%', v_non_gage; end if;
  end if;

  v_mode := coalesce(p_mode, d.payment_mode, 'pro_pays_all');
  if v_mode = 'client_pays_all' then raise exception 'le client paie cette démarche'; end if;

  select coalesce(sum(price), 0) into v_options from tracking_services where demarche_id = p_demarche_id;
  v_express := case when coalesce(d.express, false)
    then case d.t when 'DA' then 5 when 'DC' then 5 when 'CG' then 10 when 'CPI_WW' then 99 when 'WW_PROVISOIRE_PRO' then 99 else 0 end
    else 0 end;

  -- Les jetons ne couvrent que les frais de service.
  v_montant := round(coalesce(d.frais_dossier, 0) + v_options + v_express, 2);
  if v_montant <= 0 then raise exception 'montant invalide'; end if;
  -- Taxe à régler par carte ensuite (en « split », c'est le client qui la paie).
  v_taxe := case when v_mode = 'split' then 0 else round(coalesce(d.prix_carte_grise, 0), 2) end;

  perform set_config('dcg.serveur', 'on', true);
  update garages set token_balance = round(coalesce(token_balance, 0) - v_montant, 2), updated_at = now()
   where id = d.garage_id and coalesce(token_balance, 0) >= v_montant
  returning token_balance into v_solde;
  if v_solde is null then raise exception 'solde insuffisant'; end if;

  update demarches
     set paye = (v_mode <> 'split' and v_taxe = 0),
         paid_with_tokens = true,
         is_draft = false,
         documents_complets = case when p_documents_complets then true else documents_complets end,
         status = case when v_taxe > 0 then 'en_attente_paiement_pro'::demarche_status
                       else coalesce(p_statut::demarche_status, status) end,
         updated_at = now()
   where id = p_demarche_id;

  perform set_config('dcg.serveur', '', true);
  return jsonb_build_object('montant', v_montant, 'nouveau_solde', v_solde, 'mode', v_mode, 'taxe_a_payer', v_taxe);
end $$;
