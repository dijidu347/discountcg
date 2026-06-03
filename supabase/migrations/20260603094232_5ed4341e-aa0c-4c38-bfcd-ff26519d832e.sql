CREATE OR REPLACE FUNCTION public.setup_facture_cron(p_service_role_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'vault'
AS $function$
DECLARE
  v_secret_id uuid;
  v_job_id bigint;
  v_token_job_id bigint;
  v_existing_job_id bigint;
BEGIN
  -- Store/refresh the service_role_key in Vault
  SELECT id INTO v_secret_id FROM vault.secrets WHERE name = 'service_role_key';
  IF v_secret_id IS NULL THEN
    SELECT vault.create_secret(p_service_role_key, 'service_role_key', 'Service role key for cron-driven edge function calls')
      INTO v_secret_id;
  ELSE
    PERFORM vault.update_secret(v_secret_id, p_service_role_key);
  END IF;

  -- ── Job 1 : factures démarches ────────────────────────────────────────
  SELECT jobid INTO v_existing_job_id FROM cron.job WHERE jobname = 'regenerate-missing-factures-hourly';
  IF v_existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_existing_job_id);
  END IF;

  SELECT cron.schedule(
    'regenerate-missing-factures-hourly',
    '0 * * * *',
    $job$
    SELECT net.http_post(
      url := 'https://oiotlgkfwuwshpwraneb.supabase.co/functions/v1/regenerate-all-factures',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
      ),
      body := jsonb_build_object('mode', 'missing', 'limit', 100)
    );
    $job$
  ) INTO v_job_id;

  -- ── Job 2 : factures jetons (NEW) ─────────────────────────────────────
  v_existing_job_id := NULL;
  SELECT jobid INTO v_existing_job_id FROM cron.job WHERE jobname = 'regenerate-missing-token-factures-hourly';
  IF v_existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_existing_job_id);
  END IF;

  SELECT cron.schedule(
    'regenerate-missing-token-factures-hourly',
    '5 * * * *',
    $job$
    SELECT net.http_post(
      url := 'https://oiotlgkfwuwshpwraneb.supabase.co/functions/v1/regenerate-all-token-factures',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
      ),
      body := jsonb_build_object('limit', 100)
    );
    $job$
  ) INTO v_token_job_id;

  RETURN jsonb_build_object(
    'job_id', v_job_id,
    'token_job_id', v_token_job_id,
    'secret_id', v_secret_id
  );
END;
$function$;