import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const ADMIN_EMAIL = "mathieugaillac4@gmail.com";

// ── Email helpers ───────────────────────────────────────────────────────────

async function sendCoffreWelcomeEmail(resend: Resend, garage: { email: string; raison_sociale: string }, isTrialing: boolean) {
  const subject = isTrialing
    ? "Bienvenue dans votre Coffre-fort — Essai gratuit activé 🎉"
    : "Votre abonnement Coffre-fort est actif 🎉";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
      <div style="background: linear-gradient(135deg, #1e3a5f, #3b82f6); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🗄️ Coffre-fort activé !</h1>
        ${isTrialing ? '<p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">30 jours d\'essai gratuit commencent maintenant</p>' : ''}
      </div>
      <div style="background: #f9fafb; padding: 32px; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px; margin: 0 0 16px;">Bonjour <strong>${garage.raison_sociale}</strong>,</p>
        ${isTrialing
          ? `<p style="font-size: 15px; color: #374151;">Votre <strong>essai gratuit de 30 jours</strong> est maintenant actif. Vous avez accès à toutes les fonctionnalités du Coffre-fort sans aucun engagement.</p>`
          : `<p style="font-size: 15px; color: #374151;">Votre <strong>abonnement Coffre-fort à 9,99 €/mois</strong> est maintenant actif. Merci pour votre confiance !</p>`
        }
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px; color: #1e3a5f; font-size: 15px;">Ce que vous pouvez faire maintenant :</h3>
          <ul style="margin: 0; padding: 0 0 0 18px; color: #374151; font-size: 14px; line-height: 1.8;">
            <li>📸 Photographier vos factures fournisseurs</li>
            <li>📂 Les retrouver classées par catégorie</li>
            <li>📊 Exporter vos dépenses pour la comptabilité</li>
            <li>🔍 Rechercher un document en 2 secondes</li>
          </ul>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="https://www.discountcartegrise.fr/coffre-fort" style="background: #3b82f6; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">
            Accéder à mon Coffre-fort →
          </a>
        </div>
        <p style="font-size: 13px; color: #6b7280; margin: 0;">Des questions ? Répondez directement à cet email, nous sommes là pour vous aider.</p>
      </div>
      <p style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 16px;">DiscountCarteGrise — Coffre-fort factures</p>
    </div>
  `;

  await resend.emails.send({
    from: "Coffre-fort Jimmy <noreply@discountcartegrise.fr>",
    to: [garage.email],
    subject,
    html,
  });
}

async function sendAdminNotification(resend: Resend, garage: { email: string; raison_sociale: string }, eventType: "trial" | "subscribed" | "payment") {
  const labels = {
    trial: { emoji: "🆓", label: "Nouvel essai gratuit" },
    subscribed: { emoji: "💳", label: "Nouvel abonnement" },
    payment: { emoji: "💰", label: "Renouvellement payé" },
  };
  const { emoji, label } = labels[eventType];

  await resend.emails.send({
    from: "Jimmy Admin <noreply@discountcartegrise.fr>",
    to: [ADMIN_EMAIL],
    subject: `${emoji} Coffre-fort — ${label} : ${garage.raison_sociale}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #1e3a5f;">${emoji} ${label}</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 6px 0; color: #6b7280;">Garage</td><td style="font-weight: bold;">${garage.raison_sociale}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Email</td><td>${garage.email}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Événement</td><td>${label}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Date</td><td>${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td></tr>
        </table>
      </div>
    `,
  });
}

// ── Main handler ────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
    const webhookSecret = Deno.env.get("STRIPE_COFFRE_WEBHOOK_SECRET")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
    const resend = new Resend(resendApiKey);

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing stripe-signature" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Coffre webhook received: ${event.type}`);

    switch (event.type) {

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const garageId = session.metadata?.garage_id;
        const subscriptionId = session.subscription as string;

        if (!garageId || !subscriptionId) break;

        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const isTrialing = sub.status === "trialing";

        const { error } = await supabase
          .from("coffre_subscriptions")
          .update({
            stripe_subscription_id: subscriptionId,
            status: isTrialing ? "trialing" : "active",
            cancel_at_period_end: sub.cancel_at_period_end,
            trial_start: sub.trial_start ? new Date(sub.trial_start * 1000).toISOString() : null,
            trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          })
          .eq("garage_id", garageId);

        if (error) {
          console.error("Error linking subscription:", error);
        } else {
          console.log(`Subscription ${subscriptionId} linked to garage ${garageId}`);

          // Send welcome email
          const { data: garage } = await supabase
            .from("garages")
            .select("email, raison_sociale")
            .eq("id", garageId)
            .single();

          if (garage?.email) {
            try {
              await sendCoffreWelcomeEmail(resend, garage, isTrialing);
              await sendAdminNotification(resend, garage, isTrialing ? "trial" : "subscribed");
            } catch (emailErr) {
              console.error("Email error (non-fatal):", emailErr);
            }
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const garageId = subscription.metadata?.garage_id;

        if (!garageId) {
          console.log("No garage_id in metadata, skipping");
          break;
        }

        const statusMap: Record<string, string> = {
          active: "active",
          trialing: "trialing",
          past_due: "past_due",
          canceled: "canceled",
          incomplete: "past_due",
          incomplete_expired: "canceled",
          unpaid: "past_due",
          paused: "canceled",
        };
        const status = statusMap[subscription.status] || "past_due";

        const { error } = await supabase
          .from("coffre_subscriptions")
          .update({
            status,
            cancel_at_period_end: subscription.cancel_at_period_end,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
            trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          })
          .eq("stripe_subscription_id", subscription.id);

        if (error) console.error("Error updating subscription:", error);
        else console.log(`Subscription ${subscription.id} updated to ${status}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        const { error } = await supabase
          .from("coffre_subscriptions")
          .update({ status: "canceled", cancel_at_period_end: false })
          .eq("stripe_subscription_id", subscription.id);

        if (error) console.error("Error canceling subscription:", error);
        else console.log(`Subscription ${subscription.id} canceled`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          await supabase
            .from("coffre_subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", subscriptionId);
          console.log(`Subscription ${subscriptionId} set to past_due`);
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId && invoice.amount_paid > 0) {
          await supabase
            .from("coffre_subscriptions")
            .update({ status: "active" })
            .eq("stripe_subscription_id", subscriptionId);
          console.log(`Subscription ${subscriptionId} set to active after payment`);

          // Send renewal confirmation email
          const { data: sub } = await supabase
            .from("coffre_subscriptions")
            .select("garage_id")
            .eq("stripe_subscription_id", subscriptionId)
            .single();

          if (sub?.garage_id) {
            const { data: garage } = await supabase
              .from("garages")
              .select("email, raison_sociale")
              .eq("id", sub.garage_id)
              .single();

            if (garage?.email) {
              try {
                await sendAdminNotification(resend, garage, "payment");
              } catch (emailErr) {
                console.error("Email error (non-fatal):", emailErr);
              }
            }
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in webhook-stripe-coffre:", error);

    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
      await fetch(`${supabaseUrl}/functions/v1/notify-error`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey },
        body: JSON.stringify({
          source: 'webhook-stripe-coffre',
          error: error?.message || 'Unknown error',
        }),
      });
    } catch (_) { /* silent */ }

    return new Response(JSON.stringify({ error: "Erreur interne" }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
