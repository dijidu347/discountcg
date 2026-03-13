import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { token } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: 'Token required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: demarche, error } = await supabase
      .from('demarches')
      .select('id, type, immatriculation, prix_carte_grise, frais_dossier, montant_ht, montant_ttc, payment_mode, client_paid, client_payment_token_expires_at, garages(raison_sociale)')
      .eq('client_payment_token', token)
      .single();

    if (error || !demarche) {
      return new Response(JSON.stringify({ error: 'Lien de paiement invalide' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check expiration
    if (demarche.client_payment_token_expires_at && new Date(demarche.client_payment_token_expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Ce lien de paiement a expiré' }), {
        status: 410,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check already paid
    if (demarche.client_paid) {
      return new Response(JSON.stringify({ error: 'Ce paiement a déjà été effectué' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ demarche }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
