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
      .select("stripe_subscription_id, payment_mode, retention_discount_applied")
      .eq("garage_id", garage.id)
      .in("status", ["active", "trialing"])
      .single();

    if (!sub) return new Response(JSON.stringify({ error: "Aucun abonnement actif" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });

    // Only allow one retention discount per account
    if (sub.retention_discount_applied) {
      return new Response(JSON.stringify({ error: "Offre déjà utilisée" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Stripe subscriptions: apply 50% coupon for one month
    if (sub.payment_mode === "stripe" && sub.stripe_subscription_id) {
      const coupon = await stripe.coupons.create({
        percent_off: 50,
        duration: "once",
        name: "Offre fidélité coffre-fort -50%",
        max_redemptions: 1,
      });

      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        coupon: coupon.id,
      });
    }

    // Always flag as used (Stripe + tokens + beta)
    await supabase
      .from("coffre_subscriptions")
      .update({ retention_discount_applied: true } as any)
      .eq("garage_id", garage.id);

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });

  } catch (error: any) {
    console.error("apply-coffre-retention-discount error:", error);
    return new Response(JSON.stringify({ error: error.message || "Erreur interne" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
