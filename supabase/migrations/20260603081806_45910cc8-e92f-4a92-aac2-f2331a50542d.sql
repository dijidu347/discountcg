
CREATE OR REPLACE FUNCTION public.setup_facture_cron(p_service_role_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  v_secret_id uuid;
  v_job_id bigint;
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

  -- Remove any prior job with same name (idempotent)
  SELECT jobid INTO v_existing_job_id FROM cron.job WHERE jobname = 'regenerate-missing-factures-hourly';
  IF v_existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_existing_job_id);
  END IF;

  -- Schedule the cron job
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

  RETURN jsonb_build_object('job_id', v_job_id, 'secret_id', v_secret_id);
END;
$$;

REVOKE ALL ON FUNCTION public.setup_facture_cron(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.setup_facture_cron(text) TO service_role;
