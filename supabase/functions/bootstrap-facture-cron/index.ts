// One-shot bootstrap: passes the in-env service role key to a SECURITY DEFINER
// SQL helper that stores it in Vault and (re)schedules the hourly cron job.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    // Fonction d'administration : réservée aux appels porteurs de la clé de
    // service. Sans ce contrôle, n'importe qui peut reprogrammer le cron.
    const porteur = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
    if (porteur !== serviceKey) {
      console.warn('⛔ bootstrap-facture-cron : appel non autorisé');
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data, error } = await supabase.rpc('setup_facture_cron', {
      p_service_role_key: serviceKey,
    });
    if (error) throw new Error(error.message);

    return new Response(JSON.stringify({ success: true, result: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
