-- Certificat de non-gage (CG, DA, DC) controle cote serveur.
--
-- Le choix « je le fournis » / « vous le commandez » n'etait verifie que dans
-- le navigateur du garage : 11 dossiers ont ete payes sans choix depuis le
-- 2 septembre 2026. Les trois chemins de paiement pro (carte, jetons, lien
-- envoye au client) appellent desormais verifier_non_gage avant d'encaisser.

create or replace function public.verifier_non_gage(p_demarche_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  d record;
begin
  select type::text as t, non_gage_mode into d from demarches where id = p_demarche_id;
  if not found or d.t not in ('CG', 'DA', 'DC') then
    return null;
  end if;

  if d.non_gage_mode = 'fourni' then
    if exists (select 1 from documents where demarche_id = p_demarche_id and type_document = 'non_gage') then
      return null;
    end if;
    return 'Certificat de non-gage manquant : déposez-le, ou choisissez que nous le commandions pour vous.';
  end if;

  if d.non_gage_mode = 'facture' then
    -- La ligne de facturation (2 EUR) est normalement posee par le formulaire ;
    -- si elle manque, on la pose ici pour que le montant l'inclue.
    insert into tracking_services (demarche_id, service_type, price, status)
    values (p_demarche_id, 'certificat_non_gage', 2, 'pending')
    on conflict (demarche_id, service_type) do nothing;
    return null;
  end if;

  return 'Certificat de non-gage : indiquez si vous le fournissez ou si nous devons le commander.';
end;
$$;

revoke all on function public.verifier_non_gage(uuid) from public, anon, authenticated;
grant execute on function public.verifier_non_gage(uuid) to service_role;

-- Paiement avec les jetons : meme controle, avant tout debit.
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
  v_montant := round(coalesce(d.frais_dossier, 0) + v_options + v_express
    + case when v_mode = 'split' then 0 else coalesce(d.prix_carte_grise, 0) end, 2);
  if v_montant <= 0 then raise exception 'montant invalide'; end if;

  update garages set token_balance = round(coalesce(token_balance, 0) - v_montant, 2), updated_at = now()
   where id = d.garage_id and coalesce(token_balance, 0) >= v_montant
  returning token_balance into v_solde;
  if v_solde is null then raise exception 'solde insuffisant'; end if;

  update demarches
     set paye = (v_mode <> 'split'),
         paid_with_tokens = true,
         is_draft = false,
         documents_complets = case when p_documents_complets then true else documents_complets end,
         status = coalesce(p_statut::demarche_status, status),
         updated_at = now()
   where id = p_demarche_id;

  return jsonb_build_object('montant', v_montant, 'nouveau_solde', v_solde, 'mode', v_mode);
end $$;
