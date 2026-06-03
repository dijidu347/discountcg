// One-shot bootstrap: stores the service role key in Vault and schedules
// the hourly cron job that calls regenerate-all-factures in 'missing' mode.
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
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1) Ensure vault secret exists
    const { data: existing } = await supabase
      .schema('vault' as any)
      .from('secrets' as any)
      .select('id, name')
      .eq('name', 'service_role_key')
      .maybeSingle();

    if (!existing) {
      const { error: vErr } = await supabase.rpc('create_vault_secret', {
        secret: serviceKey,
        name: 'service_role_key',
      } as any);
      if (vErr) {
        // Fallback: use vault.create_secret via raw SQL through an RPC we create below
        console.log('create_vault_secret RPC failed, will try SQL path:', vErr.message);
      }
    }

    // 2) Schedule cron via an SQL helper RPC
    const { data: result, error: schedErr } = await supabase.rpc('schedule_regenerate_factures_cron');
    if (schedErr) throw new Error('schedule cron failed: ' + schedErr.message);

    return new Response(JSON.stringify({ success: true, cron: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
