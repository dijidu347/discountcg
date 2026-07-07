import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const ADMIN_EMAIL = "contact@discountcartegrise.fr";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MONTHLY_PRICE = 9.99;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Non authentifié" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const userSupabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (!user || authError) return new Response(JSON.stringify({ error: "Non authentifié" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });

    // Récupérer le garage et le solde de jetons
    const { data: garage } = await supabase
      .from("garages")
      .select("id, token_balance, raison_sociale, email")
      .eq("user_id", user.id)
      .single();

    if (!garage) return new Response(JSON.stringify({ error: "Garage non trouvé" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const balance = Number(garage.token_balance) || 0;
    if (balance < MONTHLY_PRICE) {
      return new Response(JSON.stringify({ error: `Solde insuffisant (${balance.toFixed(2)}€ disponibles, ${MONTHLY_PRICE}€ requis)` }), { status: 402, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Déduire les jetons
    const { error: deductError } = await supabase
      .from("garages")
      .update({ token_balance: balance - MONTHLY_PRICE })
      .eq("id", garage.id);

    if (deductError) throw deductError;

    // Activer/renouveler l'abonnement pour 30 jours
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const { error: upsertError } = await supabase
      .from("coffre_subscriptions")
      .upsert({
        garage_id: garage.id,
        status: "active",
        payment_mode: "tokens",
        cancel_at_period_end: false,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
      }, { onConflict: "garage_id" });

    if (upsertError) throw upsertError;

    // Send admin notification email
    try {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        const resend = new Resend(resendKey);
        const { error: emailError } = await resend.emails.send({
          from: "Jimmy Admin <noreply@discountcartegrise.fr>",
          to: [ADMIN_EMAIL],
          subject: `🪙 Coffre-fort — Abonnement jetons : ${garage.raison_sociale || "Garage"}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
              <h2 style="color: #1e3a5f;">🪙 Nouvel abonnement coffre-fort (jetons)</h2>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr><td style="padding: 6px 0; color: #6b7280;">Garage</td><td style="font-weight: bold;">${garage.raison_sociale || "—"}</td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280;">Email</td><td>${garage.email || "—"}</td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280;">Paiement</td><td>Jetons (${MONTHLY_PRICE}€)</td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280;">Nouveau solde</td><td>${(balance - MONTHLY_PRICE).toFixed(2)}€</td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280;">Date</td><td>${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td></tr>
              </table>
            </div>
          `,
        });
        // Notification annexe (l'activation est déjà faite) : on logue sans throw.
        if (emailError) console.error("❌ Resend (notif jetons coffre) a refusé l'envoi:", emailError);
      }
    } catch (emailErr) {
      console.error("Failed to send admin notification:", emailErr);
    }

    return new Response(JSON.stringify({ success: true, period_end: periodEnd.toISOString() }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });

  } catch (error: any) {
    console.error("activate-coffre-with-tokens error:", error);
    return new Response(JSON.stringify({ error: "Erreur interne" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
