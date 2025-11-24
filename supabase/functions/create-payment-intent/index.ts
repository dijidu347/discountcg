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
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
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

      // Vérifier si la commande existe et n'est pas déjà payée
      const { data: existingOrder, error: orderError } = await supabaseClient
        .from('guest_orders')
        .select('paye, payment_intent_id')
        .eq('id', metadata.order_id)
        .single();

      if (orderError) {
        console.error('Order lookup error:', orderError);
        return new Response(JSON.stringify({ error: 'Order not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Si déjà payée, empêcher un nouveau paiement
      if (existingOrder.paye) {
        console.log('Order already paid:', metadata.order_id);
        return new Response(JSON.stringify({ 
          error: 'Cette commande a déjà été payée',
          alreadyPaid: true 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create Stripe payment intent
      const response = await fetch('https://api.stripe.com/v1/payment_intents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          amount: amount.toString(),
          currency: 'eur',
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

    // Vérifier si la démarche est déjà payée
    if (demarche.paye) {
      console.log('Demarche already paid:', demarcheId);
      return new Response(JSON.stringify({ 
        error: 'Cette démarche a déjà été payée',
        alreadyPaid: true 
      }), {
        status: 400,
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
    const paymentAmount = Math.round(demarche.montant_ttc * 100);
    console.log('Payment amount (in cents):', paymentAmount, 'from TTC:', demarche.montant_ttc);

    console.log('Creating Stripe payment intent...');
    // Create Stripe payment intent
    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: paymentAmount.toString(),
        currency: 'eur',
        'metadata[demarche_id]': demarcheId,
        'metadata[garage_id]': demarche.garage_id,
        'metadata[payment_type]': paymentType || 'full',
      }),
    });

    console.log('Stripe API response status:', response.status);
    const paymentIntent = await response.json();
    console.log('Payment intent created:', { id: paymentIntent.id, status: paymentIntent.status });

    if (!response.ok) {
      console.error('Stripe API error:', paymentIntent);
      throw new Error(paymentIntent.error?.message || 'Payment intent creation failed');
    }

    console.log('Creating payment record in database...');
    // Create payment record
    const { error: paymentError } = await supabaseClient
      .from('paiements')
      .insert({
        demarche_id: demarcheId,
        garage_id: demarche.garage_id,
        montant: demarche.montant_ttc,
        status: 'en_attente',
        stripe_payment_id: paymentIntent.id,
      });

    if (paymentError) {
      console.error('Payment record error:', paymentError);
    } else {
      console.log('Payment record created successfully');
    }

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
