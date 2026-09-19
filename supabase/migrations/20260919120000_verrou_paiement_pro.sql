-- Espace pro : le navigateur du garage ne peut plus se declarer paye, se
-- rendre une demarche gratuite, baisser son prix, ni toucher a son solde ou a
-- sa verification.
--
-- Les regles d'acces laissaient un garage modifier toutes les colonnes de ses
-- demarches (paye, is_free_token, frais_dossier...) et de sa fiche (is_verified,
-- is_gold ; a la creation meme token_balance et unlimited_free_tokens). Meme
-- principe que proteger_paiement_commande_particulier : le serveur (webhook,
-- fonctions), les administrateurs et les fonctions de paiement marquees
-- dcg.serveur passent ; le reste est ramene aux valeurs autorisees.

-- Appelant de confiance : serveur, admin, ou fonction SQL de paiement.
create or replace function public.appel_de_confiance()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.role() is null
      or auth.role() = 'service_role'
      or coalesce(current_setting('dcg.serveur', true), '') = 'on'
      or public.has_role(auth.uid(), 'admin'::public.app_role)
$$;

-- Demarches ------------------------------------------------------------------
create or replace function public.proteger_paiement_demarche_pro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prix numeric;
  v_offert_possible boolean;
  v_verrouillee boolean;
begin
  if public.appel_de_confiance() then
    return new;
  end if;

  select a.prix into v_prix from actions_rapides a where a.code = new.type::text;
  select coalesce(g.free_token_available, false) or coalesce(g.unlimited_free_tokens, false)
    into v_offert_possible from garages g where g.id = new.garage_id;

  if tg_op = 'INSERT' then
    new.paye := false;
    new.paid_with_tokens := false;
    new.client_paid := false;
    new.client_paid_at := null;
    new.client_stripe_payment_id := null;
    new.pro_payment_pending := false;
    new.resubmission_paid := false;
    new.requires_resubmission_payment := false;
    new.resubmission_payment_amount := null;
    new.resubmission_payment_intent_id := null;
    new.facture_id := null;
    new.validated_at := null;
    new.validated_by := null;
    new.client_payment_token := null;
    new.client_payment_token_expires_at := null;
    new.status := 'en_saisie';
    new.is_draft := true;
    new.is_free_token := coalesce(new.is_free_token, false)
      and new.type::text in ('DA', 'DC') and coalesce(v_offert_possible, false);
    if new.is_free_token then
      new.frais_dossier := 0;
    elsif v_prix is not null then
      new.frais_dossier := v_prix;
    end if;
    return new;
  end if;

  -- Paiement, facturation et suivi : jamais depuis le navigateur.
  new.garage_id := old.garage_id;
  new.numero_demarche := old.numero_demarche;
  new.paye := old.paye;
  new.paid_with_tokens := old.paid_with_tokens;
  new.client_paid := old.client_paid;
  new.client_paid_at := old.client_paid_at;
  new.client_stripe_payment_id := old.client_stripe_payment_id;
  new.pro_payment_pending := old.pro_payment_pending;
  new.resubmission_paid := old.resubmission_paid;
  new.requires_resubmission_payment := old.requires_resubmission_payment;
  new.resubmission_payment_amount := old.resubmission_payment_amount;
  new.resubmission_payment_intent_id := old.resubmission_payment_intent_id;
  new.facture_id := old.facture_id;
  new.validated_at := old.validated_at;
  new.validated_by := old.validated_by;
  new.client_payment_token := old.client_payment_token;
  new.client_payment_token_expires_at := old.client_payment_token_expires_at;
  new.status := old.status;
  -- Un dossier envoye ne redevient pas brouillon.
  if not old.is_draft then
    new.is_draft := false;
  end if;

  -- Dossier paye ou envoye : ce qui a ete facture ne bouge plus.
  v_verrouillee := old.paye or coalesce(old.paid_with_tokens, false)
    or coalesce(old.client_paid, false) or not old.is_draft;
  if v_verrouillee then
    new.type := old.type;
    new.is_free_token := old.is_free_token;
    new.frais_dossier := old.frais_dossier;
    new.prix_carte_grise := old.prix_carte_grise;
    new.montant_ht := old.montant_ht;
    new.montant_ttc := old.montant_ttc;
    new.express := old.express;
    new.payment_mode := old.payment_mode;
    return new;
  end if;

  -- Brouillon : prix du catalogue, gratuit seulement si le garage y a droit.
  new.is_free_token := coalesce(new.is_free_token, false)
    and new.type::text in ('DA', 'DC') and coalesce(v_offert_possible, false);
  if new.is_free_token then
    new.frais_dossier := 0;
  elsif v_prix is not null then
    new.frais_dossier := v_prix;
  end if;

  -- Envoi d'un dossier offert : la gratuite est consommee ici, qu'importe ce
  -- que fait le navigateur ensuite (consommer_jeton_gratuit renverra false).
  if new.is_free_token and not new.is_draft then
    perform set_config('dcg.serveur', 'on', true);
    update garages set free_token_available = false, updated_at = now()
     where id = new.garage_id and not coalesce(unlimited_free_tokens, false);
    perform set_config('dcg.serveur', '', true);
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_paiement_demarche_pro on public.demarches;
create trigger proteger_paiement_demarche_pro
  before insert or update on public.demarches
  for each row execute function public.proteger_paiement_demarche_pro();

-- Options facturees (certificat de non-gage, 2 EUR) --------------------------
create or replace function public.proteger_options_demarche_pro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_brouillon boolean;
begin
  if public.appel_de_confiance() then
    return coalesce(new, old);
  end if;

  select d.is_draft and not d.paye and not coalesce(d.paid_with_tokens, false)
    into v_brouillon
    from demarches d where d.id = coalesce(new.demarche_id, old.demarche_id);
  -- Demarche introuvable : suppression d'un brouillon (cascade), on laisse faire.
  if not found then
    return coalesce(new, old);
  end if;
  if not coalesce(v_brouillon, false) then
    raise exception 'Les options d''un dossier envoyé ne peuvent plus être modifiées.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  if new.service_type <> 'certificat_non_gage' then
    raise exception 'Option inconnue : %', new.service_type;
  end if;
  new.price := 2;
  return new;
end;
$$;

drop trigger if exists proteger_options_demarche_pro on public.tracking_services;
create trigger proteger_options_demarche_pro
  before insert or update or delete on public.tracking_services
  for each row execute function public.proteger_options_demarche_pro();

-- Fiche garage ----------------------------------------------------------------
create or replace function public.proteger_compte_garage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.appel_de_confiance() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.token_balance := 0;
    new.free_token_available := true;
    new.unlimited_free_tokens := false;
    new.is_verified := false;
    new.is_gold := false;
    return new;
  end if;

  new.user_id := old.user_id;
  new.token_balance := old.token_balance;
  new.free_token_available := old.free_token_available;
  new.unlimited_free_tokens := old.unlimited_free_tokens;
  new.is_verified := old.is_verified;
  new.is_gold := old.is_gold;
  return new;
end;
$$;

drop trigger if exists proteger_compte_garage on public.garages;
create trigger proteger_compte_garage
  before insert or update on public.garages
  for each row execute function public.proteger_compte_garage();

-- Paiements : seuls le serveur et l'admin les enregistrent (aucun ecran garage
-- n'en cree ; la regle permettait d'en fabriquer).
drop policy if exists "Garages can insert their own paiements" on public.paiements;

-- Fonctions de paiement appelees par le garage : elles se declarent serveur
-- pour la duree de leur transaction.
create or replace function public.consommer_jeton_gratuit(p_garage_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_uid uuid := auth.uid(); g record;
begin
  if v_uid is null then raise exception 'authentification requise'; end if;
  select id, user_id, coalesce(free_token_available, false) as dispo, coalesce(unlimited_free_tokens, false) as illimite
    into g from garages where id = p_garage_id;
  if not found then raise exception 'garage introuvable'; end if;
  if g.user_id <> v_uid and not public.has_role(v_uid, 'admin'::public.app_role) then raise exception 'non autorisé'; end if;
  if g.illimite then return true; end if;
  if not g.dispo then return false; end if;
  perform set_config('dcg.serveur', 'on', true);
  update garages set free_token_available = false, updated_at = now() where id = p_garage_id;
  perform set_config('dcg.serveur', '', true);
  return true;
end $function$;

-- Paiement avec les jetons : inchange, sinon la declaration serveur.
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

  perform set_config('dcg.serveur', 'on', true);
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

  perform set_config('dcg.serveur', '', true);
  return jsonb_build_object('montant', v_montant, 'nouveau_solde', v_solde, 'mode', v_mode);
end $$;
