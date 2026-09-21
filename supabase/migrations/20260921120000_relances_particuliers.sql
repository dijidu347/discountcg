-- Relances des commandes particulier abandonnees avant paiement.
--
-- 144 personnes ont laisse leur email sans payer en 60 jours et aucune relance
-- ne partait. La fonction relance-commandes-particulier envoie au plus deux
-- rappels (a J+1 et J+3) pour la derniere commande non payee de chaque email,
-- et seulement pour les commandes creees apres la mise en service. Chaque
-- rappel contient un lien pour ne plus en recevoir.

alter table public.guest_orders
  add column if not exists relances_envoyees integer not null default 0,
  add column if not exists derniere_relance_at timestamptz,
  add column if not exists relances_stoppees boolean not null default false;

-- Toutes les heures, a la 23e minute.
select cron.schedule(
  'relance-commandes-particulier',
  '23 * * * *',
  $$
  select net.http_post(
    url := 'https://oiotlgkfwuwshpwraneb.supabase.co/functions/v1/relance-commandes-particulier',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)
    ),
    body := jsonb_build_object('action', 'relancer')
  );
  $$
);
