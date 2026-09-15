-- Solde de jetons : mouvements reserves au serveur.
--
-- Jusqu'ici le navigateur du garage ecrivait lui-meme garages.token_balance
-- (paiement d'une demarche, jeton gratuit) et la regle d'acces laissait un
-- garage modifier toute sa fiche : il pouvait donc se donner le solde de son
-- choix, puis faire payer les taxes par le compte de l'entreprise.
--
-- Desormais : trois fonctions font les mouvements cote serveur, et le droit
-- d'ecrire sur les colonnes sensibles est retire aux comptes connectes. Le
-- webhook Sogecommerce (cle de service) et ces fonctions ne sont pas concernes.

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

create or replace function public.crediter_solde_admin(p_garage_id uuid, p_montant numeric)
returns numeric language plpgsql security definer set search_path = public as $$
declare v_solde numeric;
begin
  if not public.has_role(auth.uid(), 'admin'::public.app_role) then raise exception 'réservé aux administrateurs'; end if;
  if p_montant is null or p_montant <= 0 then raise exception 'montant invalide'; end if;
  update garages set token_balance = round(coalesce(token_balance, 0) + p_montant, 2), updated_at = now()
   where id = p_garage_id returning token_balance into v_solde;
  if v_solde is null then raise exception 'garage introuvable'; end if;
  return v_solde;
end $$;

create or replace function public.consommer_jeton_gratuit(p_garage_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); g record;
begin
  if v_uid is null then raise exception 'authentification requise'; end if;
  select id, user_id, coalesce(free_token_available, false) as dispo, coalesce(unlimited_free_tokens, false) as illimite
    into g from garages where id = p_garage_id;
  if not found then raise exception 'garage introuvable'; end if;
  if g.user_id <> v_uid and not public.has_role(v_uid, 'admin'::public.app_role) then raise exception 'non autorisé'; end if;
  if g.illimite then return true; end if;
  if not g.dispo then return false; end if;
  update garages set free_token_available = false, updated_at = now() where id = p_garage_id;
  return true;
end $$;

revoke all on function public.payer_demarche_avec_solde(uuid, text, text, boolean) from public, anon;
revoke all on function public.crediter_solde_admin(uuid, numeric) from public, anon;
revoke all on function public.consommer_jeton_gratuit(uuid) from public, anon;
grant execute on function public.payer_demarche_avec_solde(uuid, text, text, boolean) to authenticated;
grant execute on function public.crediter_solde_admin(uuid, numeric) to authenticated;
grant execute on function public.consommer_jeton_gratuit(uuid) to authenticated;

-- Colonnes que plus aucun compte connecte ne peut ecrire directement.
-- Le droit d'ecriture etait donne sur toute la table : retirer trois colonnes
-- ne suffit pas, il faut retirer le droit global puis le redonner sur les
-- autres colonnes. Les fonctions ci-dessus (SECURITY DEFINER) et la cle de
-- service ne sont pas concernees.
do $$
declare colonnes text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into colonnes
    from information_schema.columns
   where table_schema = 'public' and table_name = 'garages'
     and column_name not in ('token_balance', 'free_token_available', 'unlimited_free_tokens');
  execute 'revoke update on public.garages from authenticated';
  execute 'revoke update on public.garages from anon';
  execute format('grant update (%s) on public.garages to authenticated', colonnes);
end $$;
