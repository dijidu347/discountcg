import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    // Client payments always use Stripe 2 (carte grise fees)
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY_2') || Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY_2 not configured');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const body = await req.json();
    const { token } = body;

    if (!token) {
      return new Response(JSON.stringify({ error: 'token is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Fetching demarche by client_payment_token...');

    // Fetch demarche by client_payment_token
    const { data: demarche, error: demarcheError } = await supabaseClient
      .from('demarches')
      .select('*, garages(*)')
      .eq('client_payment_token', token)
      .single();

    if (demarcheError || !demarche) {
      console.error('Demarche not found for token:', demarcheError);
      return new Response(JSON.stringify({ error: 'Lien de paiement invalide ou expiré' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Demarche found:', demarche.id);

    // Validate token not expired
    if (demarche.client_payment_token_expires_at) {
      const expiresAt = new Date(demarche.client_payment_token_expires_at);
      if (expiresAt < new Date()) {
        console.error('Payment token expired');
        return new Response(JSON.stringify({ error: 'Ce lien de paiement a expiré' }), {
          status: 410,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Validate not already paid
    if (demarche.client_paid) {
      console.error('Client already paid');
      return new Response(JSON.stringify({ error: 'Ce paiement a déjà été effectué' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate payment_mode
    const paymentMode = demarche.payment_mode;
    if (paymentMode !== 'client_pays_all' && paymentMode !== 'split') {
      console.error('Invalid payment_mode for client payment:', paymentMode);
      return new Response(JSON.stringify({ error: 'Mode de paiement invalide' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch tracking services for options total
    const { data: trackingServices } = await supabaseClient
      .from('tracking_services')
      .select('price')
      .eq('demarche_id', demarche.id);

    const optionsTotal = (trackingServices || []).reduce((sum: number, s: any) => sum + Number(s.price || 0), 0);

    // Calculate amount based on payment_mode
    const prixCarteGrise = Number(demarche.prix_carte_grise) || 0;
    const fraisDossier = Number(demarche.frais_dossier) || 0;

    let calculatedTotal: number;

    if (paymentMode === 'client_pays_all') {
      // Client pays everything: carte grise + frais dossier + options
      calculatedTotal = prixCarteGrise + fraisDossier + optionsTotal;
    } else {
      // Split: client pays only carte grise
      calculatedTotal = prixCarteGrise;
    }

    const paymentAmount = Math.round(calculatedTotal * 100);
    console.log('Payment mode:', paymentMode, 'Amount (cents):', paymentAmount, 'Total:', calculatedTotal);

    if (paymentAmount <= 0) {
      return new Response(JSON.stringify({ error: 'Montant de paiement invalide' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Stripe payment intent
    console.log('Creating Stripe payment intent for client payment...');
    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: paymentAmount.toString(),
        currency: 'eur',
        'automatic_payment_methods[enabled]': 'true',
        'metadata[demarche_id]': demarche.id,
        'metadata[garage_id]': demarche.garage_id,
        'metadata[type]': 'client_payment',
        'metadata[payment_mode]': paymentMode,
      }),
    });

    const paymentIntent = await response.json();

    if (!response.ok) {
      console.error('Stripe error:', paymentIntent);
      throw new Error(paymentIntent.error?.message || 'Payment intent creation failed');
    }

    console.log('Payment intent created:', paymentIntent.id);

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in create-client-payment-intent:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
