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
    // Stripe 1: frais de dossier only (split pro part, tokens, resubmissions)
    const stripeKey1 = Deno.env.get('STRIPE_SECRET_KEY');
    // Stripe 2: carte grise fees (pro_pays_all, client payments)
    const stripeKey2 = Deno.env.get('STRIPE_SECRET_KEY_2');
    if (!stripeKey1) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const body = await req.json();
    const { demarcheId, amount, metadata } = body;

    // Handle guest orders (no auth required)
    if (metadata?.type === 'guest_order') {
      if (!amount || !metadata.order_id) {
        return new Response(JSON.stringify({ error: 'Amount and order_id required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Guest orders use Stripe 2 (carte grise fees)
      const guestStripeKey = stripeKey2 || stripeKey1;
      const response = await fetch('https://api.stripe.com/v1/payment_intents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${guestStripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          amount: amount.toString(),
          currency: 'eur',
          'automatic_payment_methods[enabled]': 'true',
          'metadata[order_id]': metadata.order_id || '',
          'metadata[guest_order_id]': metadata.order_id || '',
          'metadata[tracking_number]': metadata.tracking_number || '',
          'metadata[type]': 'guest_order',
        }),
      });

      const paymentIntent = await response.json();

      if (!response.ok) {
        console.error('Stripe error:', paymentIntent);
        throw new Error(paymentIntent.error?.message || 'Payment intent creation failed');
      }

      return new Response(
        JSON.stringify({ 
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Handle authenticated demarche payments
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header for demarche payment');
      return new Response(JSON.stringify({ error: 'Unauthorized - Missing authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Verifying user token...');

    // Use service role client to verify the user token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (userError || !user) {
      console.error('Token verification failed:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized - Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Authenticated user:', user.id);

    const { paymentType } = body;
    console.log('Fetching demarche with ID:', demarcheId);

    // Get demarche details
    const { data: demarche, error: demarcheError } = await supabaseClient
      .from('demarches')
      .select('*, garages!inner(*)')
      .eq('id', demarcheId)
      .single();

    console.log('Demarche query result:', { demarche, error: demarcheError });

    if (demarcheError || !demarche) {
      console.error('Demarche error:', demarcheError);
      return new Response(JSON.stringify({ error: 'Démarche not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Demarche found, checking ownership');
    console.log('Garage user_id:', demarche.garages?.user_id, 'Authenticated user:', user.id);

    // Check user owns this garage
    if (demarche.garages.user_id !== user.id) {
      console.error('Ownership check failed');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Ownership check passed, calculating amount');

    // Use requested mode from body as override (workaround for DB save issue)
    const { paymentMode: requestedMode } = body;
    const paymentMode = requestedMode || demarche.payment_mode || 'pro_pays_all';
    console.log('Effective payment mode:', paymentMode, '(db:', demarche.payment_mode, ', requested:', requestedMode, ')');
    if (paymentMode === 'client_pays_all') {
      console.error('Pro should not pay when payment_mode is client_pays_all');
      return new Response(JSON.stringify({ error: 'Le client est responsable du paiement pour cette démarche' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch tracking services for the demarche
    const { data: trackingServices } = await supabaseClient
      .from('tracking_services')
      .select('price')
      .eq('demarche_id', demarcheId);

    const optionsTotal = (trackingServices || []).reduce((sum: number, s: any) => sum + Number(s.price || 0), 0);

    // Calculate amount based on payment_mode
    const prixCarteGrise = Number(demarche.prix_carte_grise) || 0;
    const fraisDossier = Number(demarche.frais_dossier) || 0;
    const totalServices = fraisDossier + optionsTotal;

    let calculatedTotal: number;

    if (paymentMode === 'split') {
      // Split mode: pro only pays frais_dossier + options (no prix_carte_grise)
      calculatedTotal = totalServices;
      console.log('Split mode: pro pays services only:', calculatedTotal);
    } else {
      // pro_pays_all: full amount
      calculatedTotal = prixCarteGrise + totalServices;
      console.log('Pro pays all:', calculatedTotal);
    }

    // Use calculated total (sans TVA)
    const paymentAmount = Math.round(calculatedTotal * 100);
    console.log('Payment amount (in cents):', paymentAmount, 'Calculated total (sans TVA):', calculatedTotal);

    // Select Stripe account:
    // - split mode (pro pays frais dossier only) → Stripe 1
    // - pro_pays_all (pro pays everything) → Stripe 2
    const useStripe2 = paymentMode !== 'split';
    const activeStripeKey = useStripe2 && stripeKey2 ? stripeKey2 : stripeKey1;
    console.log('Creating Stripe payment intent... (account:', useStripe2 ? 'Stripe2' : 'Stripe1', ')');
    // Create Stripe payment intent with automatic payment methods for wallet support
    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${activeStripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: paymentAmount.toString(),
        currency: 'eur',
        'automatic_payment_methods[enabled]': 'true',
        'metadata[demarche_id]': demarcheId,
        'metadata[garage_id]': demarche.garage_id,
        'metadata[payment_type]': paymentType || 'full',
        'metadata[payment_mode]': paymentMode,
      }),
    });

    console.log('Stripe API response status:', response.status);
    const paymentIntent = await response.json();
    console.log('Payment intent created:', { id: paymentIntent.id, status: paymentIntent.status });

    if (!response.ok) {
      console.error('Stripe API error:', paymentIntent);
      throw new Error(paymentIntent.error?.message || 'Payment intent creation failed');
    }

    // Paiement record is created by the webhook on payment success (upsert by stripe_payment_id)
    console.log('Returning client secret to frontend');
    return new Response(
      JSON.stringify({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in create-payment-intent:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
