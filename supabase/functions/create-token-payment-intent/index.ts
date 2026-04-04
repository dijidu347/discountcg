import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-08-27.basil',
    });

    const { packId, garage_id } = await req.json();

    console.log("Creating token payment intent for packId:", packId, "garage_id:", garage_id);

    // SECURITY FIX: Validate pack exists and get price from database
    // Never trust client-provided price values
    if (!packId) {
      console.error("Missing packId");
      return new Response(
        JSON.stringify({ error: "Pack ID requis" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (!garage_id) {
      console.error("Missing garage_id");
      return new Response(
        JSON.stringify({ error: "Garage ID requis" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Fetch pack from database to get the REAL price
    const { data: pack, error: packError } = await supabase
      .from("token_pricing")
      .select("*")
      .eq("id", packId)
      .eq("active", true)
      .single();

    if (packError || !pack) {
      console.error("Pack not found or inactive:", packError);
      return new Response(
        JSON.stringify({ error: "Pack de crédits invalide ou inactif" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log("Pack validated from DB - ID:", pack.id, "Price:", pack.price, "Quantity:", pack.quantity);

    // Get garage information for metadata
    let garageName = "Unknown";
    const { data: garage } = await supabase
      .from("garages")
      .select("raison_sociale")
      .eq("id", garage_id)
      .single();
    
    if (garage) {
      garageName = garage.raison_sociale;
    }

    // Create payment intent with SERVER-VALIDATED price from database
    // Amount is in cents for Stripe
    const amountInCents = Math.round(pack.price * 100);
    
    console.log("Creating Stripe payment intent with amount:", amountInCents, "cents");

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'eur',
      metadata: {
        type: 'token_purchase',
        pack_id: pack.id,
        quantity: pack.quantity.toString(),
        price: pack.price.toString(),
        garage_id: garage_id,
        garage_name: garageName,
      },
    });

    console.log("Payment intent created successfully:", paymentIntent.id);

    return new Response(
      JSON.stringify({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: pack.price,
        quantity: pack.quantity,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in create-token-payment-intent:', error);

    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
      await fetch(`${supabaseUrl}/functions/v1/notify-error`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey },
        body: JSON.stringify({
          source: 'create-token-payment-intent',
          error: error?.message || 'Unknown error',
        }),
      });
    } catch (_) { /* silent */ }

    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
