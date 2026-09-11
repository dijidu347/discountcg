-- Bilan des encaissements Stripe depuis le 30/06/2026.
--
-- La fonction bilan-stripe interroge les deux comptes Stripe (paiements,
-- remboursements, frais, virements vers la banque, solde) et range le dernier
-- resultat ici, pour la page /admin/bilan-stripe. Lecture reservee aux
-- administrateurs ; seule la fonction (cle de service) ecrit.

create table if not exists public.bilan_stripe (
  id text primary key,
  resultat jsonb not null,
  calcule_le timestamptz not null default now()
);
alter table public.bilan_stripe enable row level security;
drop policy if exists "Admins lisent le bilan Stripe" on public.bilan_stripe;
create policy "Admins lisent le bilan Stripe" on public.bilan_stripe for select
  using (public.has_role(auth.uid(), 'admin'::public.app_role));
