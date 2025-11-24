import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to validate if a PaymentIntent is valid and matches current Stripe mode
async function validatePaymentIntent(paymentIntentId: string, stripeKey: string): Promise<any | null> {
  try {
    console.log(`Validating PaymentIntent: ${paymentIntentId}`);
    
    // Detect current Stripe mode from key
    const isTestMode = stripeKey.startsWith('sk_test_');
    console.log(`Current Stripe mode: ${isTestMode ? 'TEST' : 'LIVE'}`);
    
    const response = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      console.error(`PaymentIntent validation failed:`, error);
      
      // Check for test/live mode mismatch
      if (error.error?.message?.includes('test mode') || error.error?.message?.includes('live mode')) {
        console.log('Mode mismatch detected - PaymentIntent is invalid');
        return null;
      }
      
      return null;
    }

    const paymentIntent = await response.json();
    console.log(`PaymentIntent validated successfully: ${paymentIntent.id}, status: ${paymentIntent.status}`);
    
    // Check if PaymentIntent mode matches current key mode
    const piIsLiveMode = paymentIntent.livemode;
    const keyIsLiveMode = !isTestMode;
    
    if (piIsLiveMode !== keyIsLiveMode) {
      console.log(`Mode mismatch: PaymentIntent is ${piIsLiveMode ? 'LIVE' : 'TEST'} but key is ${keyIsLiveMode ? 'LIVE' : 'TEST'}`);
      return null;
    }
    
    return paymentIntent;
  } catch (error) {
    console.error('Error validating PaymentIntent:', error);
    return null;
  }
}

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
      if (!amount) {
        return new Response(JSON.stringify({ error: 'Amount required' }), {
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

    // Check if a payment already exists for this demarche
    console.log('Checking for existing payment...');
    const { data: existingPayments, error: fetchError } = await supabaseClient
      .from('paiements')
      .select('*')
      .eq('demarche_id', demarcheId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Error fetching existing payment:', fetchError);
    }

    let paymentIntent: any = null;
    let shouldCreateNew = true;

    // If a payment exists, validate its PaymentIntent
    if (existingPayments && existingPayments.length > 0) {
      const existingPayment = existingPayments[0];
      console.log('Found existing payment:', existingPayment.id, 'with PaymentIntent:', existingPayment.stripe_payment_id);

      if (existingPayment.stripe_payment_id) {
        paymentIntent = await validatePaymentIntent(existingPayment.stripe_payment_id, stripeKey);
        
        if (paymentIntent) {
          console.log('Existing PaymentIntent is valid, reusing it');
          shouldCreateNew = false;
        } else {
          console.log('Existing PaymentIntent is invalid, will delete and create new one');
          // Delete invalid payment record
          const { error: deleteError } = await supabaseClient
            .from('paiements')
            .delete()
            .eq('id', existingPayment.id);
          
          if (deleteError) {
            console.error('Error deleting invalid payment:', deleteError);
          } else {
            console.log('Invalid payment deleted successfully');
          }
        }
      }
    }

    // Create new PaymentIntent if needed
    if (shouldCreateNew) {
      console.log('Creating new Stripe payment intent...');
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
      paymentIntent = await response.json();
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
