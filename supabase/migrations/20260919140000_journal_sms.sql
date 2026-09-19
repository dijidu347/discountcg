-- Journal des SMS d'alerte (dossiers prioritaires, SMS de test).
--
-- Les journaux des fonctions serveur ne remontent qu'a quelques jours : on ne
-- pouvait pas savoir si les alertes SMS Partner partaient. Chaque tentative est
-- desormais enregistree avec la reponse de SMS Partner. Lecture admin seulement ;
-- seules les fonctions serveur ecrivent.

create table if not exists public.sms_envois (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  contexte text not null,          -- paiement_pro, paiement_particulier, paiement_client, jetons, test
  reference text,                  -- numero de demarche ou de commande
  message text not null,
  destinataire text,               -- numero masque, 2 derniers chiffres
  envoye boolean not null,
  reponse jsonb,
  erreur text
);

create index if not exists sms_envois_reference_idx on public.sms_envois (reference);
create index if not exists sms_envois_created_at_idx on public.sms_envois (created_at desc);

alter table public.sms_envois enable row level security;

drop policy if exists "Admins lisent le journal SMS" on public.sms_envois;
create policy "Admins lisent le journal SMS" on public.sms_envois
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));
