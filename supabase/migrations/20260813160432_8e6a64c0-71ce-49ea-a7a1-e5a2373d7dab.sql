CREATE OR REPLACE FUNCTION public.get_admin_revenue_totals(
  p_start timestamptz DEFAULT '2024-01-01'::timestamptz,
  p_end timestamptz DEFAULT now()
)
RETURNS TABLE (
  total_service_fees numeric,
  total_token_revenue numeric,
  total_revenue numeric,
  total_demarches bigint,
  cb_paid_demarches bigint,
  avg_revenue_per_demarche numeric,
  token_paid_demarches bigint,
  free_token_demarches bigint,
  total_tokens_spent numeric,
  total_tokens_credited bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Accès refusé : administrateur requis'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH valid_paiements AS (
    SELECT
      p.montant,
      d.paid_with_tokens,
      d.is_free_token,
      d.frais_dossier,
      d.type
    FROM public.paiements p
    JOIN public.demarches d ON d.id = p.demarche_id
    WHERE p.status = 'valide'
      AND p.created_at >= p_start
      AND p.created_at <= p_end
  ),
  rev AS (
    SELECT COALESCE(SUM(
      CASE
        WHEN paid_with_tokens OR is_free_token THEN 0
        WHEN type IN ('CG','CG_DA','CG_IMPORT') THEN COALESCE(NULLIF(frais_dossier, 0), 20)
        ELSE montant
      END
    ), 0) AS total_service_fees
    FROM valid_paiements
  ),
  tok AS (
    SELECT
      COALESCE(SUM(amount), 0) AS total_token_revenue,
      COALESCE(SUM(quantity), 0) AS total_tokens_credited
    FROM public.token_purchases
    WHERE created_at >= p_start
      AND created_at <= p_end
  ),
  dem AS (
    SELECT
      COUNT(*) AS total_demarches,
      COUNT(*) FILTER (WHERE paye AND NOT paid_with_tokens AND NOT is_free_token) AS cb_paid_demarches,
      COUNT(*) FILTER (WHERE paid_with_tokens) AS token_paid_demarches,
      COUNT(*) FILTER (WHERE is_free_token) AS free_token_demarches,
      COALESCE(SUM(
        CASE WHEN paid_with_tokens THEN COALESCE(NULLIF(frais_dossier, 0), NULLIF(montant_ttc, 0), 0) ELSE 0 END
      ), 0) AS total_tokens_spent
    FROM public.demarches
    WHERE is_draft = false
      AND created_at >= p_start
      AND created_at <= p_end
  )
  SELECT
    rev.total_service_fees,
    tok.total_token_revenue,
    rev.total_service_fees + tok.total_token_revenue,
    dem.total_demarches,
    dem.cb_paid_demarches,
    CASE WHEN dem.cb_paid_demarches > 0 THEN rev.total_service_fees / dem.cb_paid_demarches ELSE 0 END,
    dem.token_paid_demarches,
    dem.free_token_demarches,
    dem.total_tokens_spent,
    tok.total_tokens_credited
  FROM rev, tok, dem;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_revenue_totals(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_revenue_totals(timestamptz, timestamptz) TO authenticated;