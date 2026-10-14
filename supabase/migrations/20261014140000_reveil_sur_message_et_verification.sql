-- Audit du 14 octobre 2026 : trois autres règles vivaient dans un écran.
--
-- Après le réveil des démarches sur dépôt de pièce, j'ai cherché les règles de
-- la même famille — un effet attendu, écrit dans UN composant, alors que
-- l'événement arrive par plusieurs chemins. Trois sont ressorties, chacune
-- mesurée sur les données :
--
--   • un MESSAGE de garage ne réveille pas sa démarche
--     27 démarches où le dernier message du garage est postérieur à la dernière
--     action de l'admin, et qui restent marquées « vues ». La plus ancienne
--     attend 52 jours, la plus récente une heure.
--
--   • un MESSAGE de particulier ne réveille pas sa commande
--     7 commandes sur 29 ayant reçu un message client.
--
--   • un JUSTIFICATIF de vérification ne fait pas remonter le garage
--     7 garages ont déposé une pièce en attente sans jamais apparaître dans
--     « à vérifier ». Quatre ne sont toujours pas vérifiés, dont un depuis
--     78 jours : un garage non vérifié ne peut pas travailler normalement.
--
-- Les commandes des particuliers étaient déjà couvertes pour les DOCUMENTS
-- (trigger_reset_guest_order_admin_viewed) : c'est le modèle qu'on étend.
--
-- Comme pour les pièces, la règle descend en base, sur l'insertion. Un message
-- ou un document déposé par un administrateur ne réveille rien : c'est lui qui
-- vient de l'écrire.

-- ── Un message de garage réveille sa démarche ────────────────────────────────
create or replace function public.reveiller_demarche_sur_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.sender_type, '') = 'admin' or new.demarche_id is null then
    return new;
  end if;

  update public.demarches
     set admin_viewed = false,
         updated_at = now()
   where id = new.demarche_id;

  return new;
end;
$$;

drop trigger if exists messages_reveiller_demarche on public.messages;
create trigger messages_reveiller_demarche
  after insert on public.messages
  for each row execute function public.reveiller_demarche_sur_message();

-- ── Un message de particulier réveille sa commande ───────────────────────────
create or replace function public.reveiller_commande_sur_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.sender_type, '') = 'admin' or new.order_id is null then
    return new;
  end if;

  update public.guest_orders
     set admin_viewed = false,
         updated_at = now()
   where id = new.order_id;

  return new;
end;
$$;

drop trigger if exists guest_order_messages_reveiller_commande on public.guest_order_messages;
create trigger guest_order_messages_reveiller_commande
  after insert on public.guest_order_messages
  for each row execute function public.reveiller_commande_sur_message();

-- ── Un justificatif déposé fait remonter le garage ───────────────────────────
create or replace function public.reveiller_garage_sur_justificatif()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and has_role(auth.uid(), 'admin'::app_role) then
    return new;
  end if;

  update public.garages
     set verification_admin_viewed = false
   where id = new.garage_id;

  return new;
end;
$$;

drop trigger if exists verification_documents_reveiller_garage on public.verification_documents;
create trigger verification_documents_reveiller_garage
  after insert on public.verification_documents
  for each row execute function public.reveiller_garage_sur_justificatif();
