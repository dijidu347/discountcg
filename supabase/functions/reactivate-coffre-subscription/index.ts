import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

    const authHeader = req.headers.get("authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Non authentifié" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const userSupabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userSupabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Non authentifié" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const { data: garage } = await supabase.from("garages").select("id").eq("user_id", user.id).single();
    if (!garage) return new Response(JSON.stringify({ error: "Garage non trouvé" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const { data: sub } = await supabase
      .from("coffre_subscriptions")
      .select("stripe_subscription_id, payment_mode")
      .eq("garage_id", garage.id)
      .single();

    if (!sub) return new Response(JSON.stringify({ error: "Aucun abonnement trouvé" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });

    // Reactivate Stripe subscription
    if (sub.payment_mode === "stripe" && sub.stripe_subscription_id) {
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: false,
      });
    }

    // Update local DB
    await supabase
      .from("coffre_subscriptions")
      .update({ cancel_at_period_end: false, status: "active" })
      .eq("garage_id", garage.id);

    return new Response(JSON.stringify({ reactivated: true }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });

  } catch (error: any) {
    console.error("reactivate-coffre-subscription error:", error);
    return new Response(JSON.stringify({ error: error.message || "Erreur interne" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
