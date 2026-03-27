import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
    const priceId = Deno.env.get("COFFRE_FORT_PRICE_ID")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

    // Authenticate user
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non authentifie" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userSupabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();

    if (!user || authError) {
      return new Response(JSON.stringify({ error: "Non authentifie" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get garage for this user
    const { data: garage, error: garageError } = await supabase
      .from("garages")
      .select("id, email, raison_sociale")
      .eq("user_id", user.id)
      .single();

    if (!garage || garageError) {
      return new Response(JSON.stringify({ error: "Garage non trouve" }), {
        status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if subscription already exists
    const { data: existingSub } = await supabase
      .from("coffre_subscriptions")
      .select("id, status, stripe_subscription_id, stripe_customer_id")
      .eq("garage_id", garage.id)
      .single();

    if (existingSub && existingSub.status === "active") {
      return new Response(JSON.stringify({ error: "Abonnement deja actif" }), {
        status: 409, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (existingSub && existingSub.status === "trialing") {
      return new Response(JSON.stringify({ error: "Essai gratuit deja en cours" }), {
        status: 409, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Create or retrieve Stripe Customer
    let customerId: string;
    if (existingSub?.stripe_customer_id) {
      customerId = existingSub.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: garage.email || user.email,
        name: garage.raison_sociale,
        metadata: { garage_id: garage.id, supabase_user_id: user.id },
      });
      customerId = customer.id;
    }

    // Create Stripe Checkout Session with trial
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 30,
        metadata: { garage_id: garage.id },
      },
      success_url: `${req.headers.get("origin") || "https://www.discountcartegrise.fr"}/coffre-fort?subscribed=true`,
      cancel_url: `${req.headers.get("origin") || "https://www.discountcartegrise.fr"}/coffre-fort-sales`,
      metadata: { garage_id: garage.id },
    });

    // Pre-create subscription record
    const { error: upsertError } = await supabase
      .from("coffre_subscriptions")
      .upsert({
        garage_id: garage.id,
        stripe_customer_id: customerId,
        status: "pending",
        cancel_at_period_end: false,
      }, { onConflict: "garage_id" });

    if (upsertError) {
      console.error("Upsert error:", upsertError);
    }

    console.log(`Coffre-fort checkout session created for garage ${garage.id}: ${session.id}`);

    return new Response(JSON.stringify({ checkout_url: session.url }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in create-coffre-subscription:", error);
    return new Response(JSON.stringify({ error: "Erreur interne" }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
