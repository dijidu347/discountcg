-- Le solde de crédits qui sert à identifier les plaques.
--
-- Le 1er octobre 2026, l'identification s'est arrêtée sur tout le site parce
-- qu'un fournisseur avait perdu son accès. Le fournisseur a changé, mais il
-- reste un scénario qui produirait la même panne, en plus bête : tomber à zéro
-- crédit sans l'avoir vu venir.
--
-- Une seule ligne, relevée une fois par jour. Elle sert à prévenir avant la
-- panne, et à afficher le solde sans aller le chercher chez le fournisseur.

create table if not exists public.solde_plaques (
  id smallint primary key default 1,
  solde integer not null,
  releve_le timestamptz not null default now(),
  -- Le seuil pour lequel l'alerte est déjà partie. Un rechargement remonte
  -- au-dessus des seuils, remet cette colonne à null, et réarme l'alerte.
  seuil_alerte_le integer,
  constraint solde_plaques_une_seule_ligne check (id = 1)
);

comment on table public.solde_plaques is
  'Crédits restants chez le fournisseur d''identification des plaques. Relevé quotidien.';

alter table public.solde_plaques enable row level security;

-- Lecture réservée à l'administration : c'est une information de gestion, elle
-- n'a rien à faire dans le navigateur d'un client.
drop policy if exists "solde lisible par les admins" on public.solde_plaques;
create policy "solde lisible par les admins"
  on public.solde_plaques for select
  using (public.has_role(auth.uid(), 'admin'));

-- Écriture par la fonction de relevé seule, qui passe par la clé de service.

-- Une fois par jour à 7 h : de quoi voir l'alerte en arrivant.
select cron.unschedule('solde-plaques-quotidien')
 where exists (select 1 from cron.job where jobname = 'solde-plaques-quotidien');

select cron.schedule(
  'solde-plaques-quotidien',
  '0 7 * * *',
  $job$
  select net.http_post(
    url := 'https://oiotlgkfwuwshpwraneb.supabase.co/functions/v1/solde-plaques',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $job$
);
