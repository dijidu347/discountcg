-- La minuterie de la relance des démarches abandonnées.
--
-- 9 h 05, après celle des dossiers en sommeil (8 h 17) : un garage concerné
-- par les deux ne reçoit pas deux courriers dans la même minute. Une fois par
-- jour suffit — les seuils sont à deux et sept jours, pas à l'heure près.
--
-- La clé de service vient du coffre, comme pour les autres minuteries : elle
-- n'apparaît jamais en clair dans la définition du cron.

select cron.unschedule('relance-demarches-abandonnees')
 where exists (select 1 from cron.job where jobname = 'relance-demarches-abandonnees');

select cron.schedule(
  'relance-demarches-abandonnees',
  '5 9 * * *',
  $$
  select net.http_post(
    url := 'https://oiotlgkfwuwshpwraneb.supabase.co/functions/v1/relance-demarches-abandonnees',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)
    ),
    body := '{}'::jsonb
  );
  $$
);
