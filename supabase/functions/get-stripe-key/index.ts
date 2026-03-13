import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Stripe 1: frais de dossier (pro split payments, token purchases, resubmissions)
    const publishableKey = Deno.env.get('VITE_STRIPE_PUBLISHABLE_KEY');
    // Stripe 2: carte grise fees (pro_pays_all, client_pays_all, split client part)
    const publishableKey2 = Deno.env.get('STRIPE_PUBLISHABLE_KEY_2');

    if (!publishableKey) {
      throw new Error('VITE_STRIPE_PUBLISHABLE_KEY not configured');
    }

    return new Response(
      JSON.stringify({ publishableKey, publishableKey2: publishableKey2 || null }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in get-stripe-key:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
