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

  if (req.method !== "POST") {
    return new Response(null, { status: 405, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Get garage
    const { data: garage } = await supabase
      .from("garages")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!garage) {
      return new Response(JSON.stringify({ error: "Garage non trouve" }), {
        status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get subscription
    const { data: sub } = await supabase
      .from("coffre_subscriptions")
      .select("id, stripe_subscription_id, payment_mode")
      .eq("garage_id", garage.id)
      .in("status", ["active", "trialing"])
      .single();

    if (!sub) {
      return new Response(JSON.stringify({ error: "Aucun abonnement actif" }), {
        status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Handle Stripe subscriptions
    if (sub.payment_mode === "stripe" && sub.stripe_subscription_id) {
      const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
      const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
    }

    // Update local DB (works for both stripe and tokens)
    await supabase
      .from("coffre_subscriptions")
      .update({ cancel_at_period_end: true })
      .eq("garage_id", garage.id);

    console.log(`Coffre subscription canceled for garage ${garage.id} (mode: ${sub.payment_mode})`);

    return new Response(JSON.stringify({ canceled: true }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in cancel-coffre-subscription:", error);
    return new Response(JSON.stringify({ error: "Erreur interne" }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
