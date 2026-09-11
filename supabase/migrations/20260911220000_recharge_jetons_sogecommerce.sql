-- Recharge de solde (jetons) via Sogecommerce.
--
-- La reference de paiement d'un achat de jetons devient unique : l'IPN de
-- Sogecommerce peut etre rejouee, et l'enregistrement de l'achat sert de verrou
-- avant de crediter le solde. Aucun doublon n'existait.
--
-- crediter_solde_jetons ajoute le montant en une seule instruction (plus de
-- lecture puis ecriture du solde, qui pouvait perdre un credit). Reservee au
-- serveur (webhook-sogecommerce).

create unique index if not exists token_purchases_reference_unique
  on public.token_purchases (stripe_payment_id) where stripe_payment_id is not null;

create or replace function public.crediter_solde_jetons(p_garage_id uuid, p_montant numeric)
returns numeric language sql security definer set search_path = public as $$
  update public.garages
     set token_balance = coalesce(token_balance, 0) + p_montant, updated_at = now()
   where id = p_garage_id
  returning token_balance;
$$;
revoke all on function public.crediter_solde_jetons(uuid, numeric) from public, anon, authenticated;
grant execute on function public.crediter_solde_jetons(uuid, numeric) to service_role;
