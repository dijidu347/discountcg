import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * sync-coffre-subscription
 * Called after Stripe Checkout success to immediately sync subscription status
 * from Stripe into the DB — without waiting for the webhook.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

    // Auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Non authentifié" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const userSupabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userSupabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Non authentifié" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });

    // Get garage
    const { data: garage } = await supabase.from("garages").select("id").eq("user_id", user.id).single();
    if (!garage) return new Response(JSON.stringify({ error: "Garage non trouvé" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });

    // Get local subscription row
    const { data: localSub } = await supabase
      .from("coffre_subscriptions")
      .select("*")
      .eq("garage_id", garage.id)
      .maybeSingle();

    if (!localSub) {
      return new Response(JSON.stringify({ status: "no_subscription" }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // If already active/trialing, nothing to do
    if (localSub.status === "active" || localSub.status === "trialing") {
      return new Response(JSON.stringify({ status: localSub.status, synced: false }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Try to find the Stripe subscription via customer
    if (!localSub.stripe_customer_id && !localSub.stripe_subscription_id) {
      return new Response(JSON.stringify({ status: "pending", synced: false }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    let stripeSub: Stripe.Subscription | null = null;

    if (localSub.stripe_subscription_id) {
      stripeSub = await stripe.subscriptions.retrieve(localSub.stripe_subscription_id);
    } else if (localSub.stripe_customer_id) {
      // Find latest subscription for this customer
      const subs = await stripe.subscriptions.list({
        customer: localSub.stripe_customer_id,
        limit: 1,
        status: "all",
      });
      if (subs.data.length > 0) {
        stripeSub = subs.data[0];
      }
    }

    if (!stripeSub) {
      return new Response(JSON.stringify({ status: "pending", synced: false }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const statusMap: Record<string, string> = {
      active: "active",
      trialing: "trialing",
      past_due: "past_due",
      canceled: "canceled",
      incomplete: "pending",
      incomplete_expired: "canceled",
      unpaid: "past_due",
      paused: "canceled",
    };
    const newStatus = statusMap[stripeSub.status] || "pending";

    // Update DB
    await supabase
      .from("coffre_subscriptions")
      .update({
        stripe_subscription_id: stripeSub.id,
        status: newStatus,
        cancel_at_period_end: stripeSub.cancel_at_period_end,
        trial_start: stripeSub.trial_start ? new Date(stripeSub.trial_start * 1000).toISOString() : null,
        trial_end: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000).toISOString() : null,
        current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
        current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
      })
      .eq("garage_id", garage.id);

    console.log(`Synced subscription for garage ${garage.id}: ${stripeSub.status} → ${newStatus}`);

    return new Response(JSON.stringify({ status: newStatus, synced: true }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });

  } catch (error: any) {
    console.error("sync-coffre-subscription error:", error);
    return new Response(JSON.stringify({ error: error.message || "Erreur interne" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
