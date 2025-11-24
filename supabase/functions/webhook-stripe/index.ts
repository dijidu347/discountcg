import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe?target=deno";

// Stripe client
const stripe = Stripe(Deno.env.get("STRIPE_SECRET_KEY_TEST"), {
  apiVersion: "2023-10-16",
});

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// -----------------------------
// HTML GENERATORS (inchangé)
// -----------------------------

function generateDemarcheFactureHTML(facture: any, demarche: any, garage: any): string {
  const date = new Date(facture.created_at).toLocaleDateString("fr-FR");
  return `YOUR_HTML_HERE`; // ⚠️ Pour alléger la réponse, mets ton HTML ici (identique à ton fichier)
}

function generateGuestOrderFactureHTML(facture: any, order: any): string {
  const date = new Date(facture.created_at).toLocaleDateString("fr-FR");
  return `YOUR_HTML_HERE`; // ⚠️ Mets ton HTML complet ici (identique à ton fichier)
}

// -----------------------------
// WEBHOOK SERVER
// -----------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event;

  try {
    // 🔥 Vérification **OBLIGATOIRE**
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    const error = err as Error;
    console.error("❌ Invalid Stripe Signature:", error.message);
    return new Response(`Webhook error: ${error.message}`, {
      status: 400,
      headers: corsHeaders,
    });
  }

  console.log("✔️ Stripe event reçu :", event.type);

  // Supabase client (service role)
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // -----------------------------
  // SWITCH — TOUS TES TRAITEMENTS
  // -----------------------------

  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object;
      const demarcheId = paymentIntent.metadata.demarche_id;
      const garageId = paymentIntent.metadata.garage_id;
      const guestOrderId = paymentIntent.metadata.guest_order_id;

      // -----------------------------------
      // 🔵 GESTION DES "guest_orders"
      // -----------------------------------
      if (guestOrderId) {
        // 1. Marquer la commande payée
        await supabase
          .from("guest_orders")
          .update({
            paye: true,
            paid_at: new Date().toISOString(),
            status: "en_traitement",
            payment_intent_id: paymentIntent.id,
          })
          .eq("id", guestOrderId);

        const { data: order } = await supabase.from("guest_orders").select("*").eq("id", guestOrderId).single();

        if (order) {
          // -----------------------------
          // FACTURE "guest order"
          // -----------------------------
          try {
            const { data: numeroData } = await supabase.rpc("generate_facture_numero");

            if (numeroData) {
              const numero = numeroData as string;
              const montantTTC = Number(order.montant_ttc);
              const montantHT = montantTTC / 1.2;

              const { data: facture } = await supabase
                .from("factures")
                .insert({
                  numero,
                  guest_order_id: guestOrderId,
                  montant_ht: montantHT,
                  montant_ttc: montantTTC,
                  tva: 20,
                })
                .select()
                .single();

              if (facture) {
                const htmlContent = generateGuestOrderFactureHTML(facture, order);

                const fileName = `guest-orders/${order.tracking_number}/${facture.numero}.html`;

                await supabase.storage.from("factures").upload(fileName, htmlContent, {
                  contentType: "text/html",
                  upsert: true,
                });

                const {
                  data: { publicUrl },
                } = supabase.storage.from("factures").getPublicUrl(fileName);

                await supabase.from("factures").update({ pdf_url: publicUrl }).eq("id", facture.id);

                console.log("✔️ Facture guest order créée :", facture.numero);
              }
            }
          } catch (err) {
            console.error("❌ Erreur facture guest order:", err);
          }

          // -----------------------------
          // EMAIL via nouvelle fonction send-email
          // -----------------------------
          console.log("📧 Vérification email_notifications:", order.email_notifications);
          if (order.email_notifications) {
            console.log("📧 Envoi email payment_confirmed à:", order.email);
            try {
              const emailResult = await supabase.functions.invoke("send-email", {
                body: {
                  type: "payment_confirmed",
                  to: order.email,
                  data: {
                    tracking_number: order.tracking_number,
                    nom: order.nom,
                    prenom: order.prenom,
                    immatriculation: order.immatriculation,
                    montant_ttc: order.montant_ttc,
                  },
                },
              });
              console.log("✅ Email envoyé, résultat:", emailResult);
              if (emailResult.error) {
                console.error("❌ Erreur email:", emailResult.error);
              }
            } catch (emailError) {
              console.error("❌ Exception lors de l'envoi email:", emailError);
            }
          } else {
            console.log("ℹ️ Email notifications désactivées pour cette commande");
          }
        }

        console.log("✔️ guest order traité :", guestOrderId);
      }

      // -----------------------------------
      // 🔵 GESTION DÉMARCHE NORMALE
      // -----------------------------------
      else if (demarcheId) {
        await supabase
          .from("paiements")
          .update({
            status: "valide",
            validated_at: new Date().toISOString(),
          })
          .eq("stripe_payment_id", paymentIntent.id);

        await supabase
          .from("demarches")
          .update({
            paye: true,
            status: "en_attente",
            is_draft: false,
          })
          .eq("id", demarcheId);

        // Récupération démarche + garage
        const { data: demarche } = await supabase
          .from("demarches")
          .select("*, garages(*)")
          .eq("id", demarcheId)
          .single();

        // -----------------------------
        // FACTURE DÉMARCHE
        // -----------------------------
        if (demarche) {
          try {
            const { data: existingFacture } = await supabase
              .from("factures")
              .select("*")
              .eq("demarche_id", demarcheId)
              .maybeSingle();

            if (!existingFacture) {
              const { data: numeroData } = await supabase.rpc("generate_facture_numero");

              if (numeroData) {
                const numero = numeroData as string;

                const { data: facture } = await supabase
                  .from("factures")
                  .insert({
                    numero,
                    demarche_id: demarcheId,
                    garage_id: demarche.garage_id,
                    montant_ht: demarche.montant_ht || 0,
                    montant_ttc: demarche.montant_ttc || 0,
                    tva: 20,
                  })
                  .select()
                  .single();

                if (facture) {
                  const html = generateDemarcheFactureHTML(facture, demarche, demarche.garages);

                  const fileName = `${demarche.garage_id}/${facture.numero}.html`;

                  await supabase.storage.from("factures").upload(fileName, html, {
                    contentType: "text/html",
                    upsert: true,
                  });

                  const {
                    data: { publicUrl },
                  } = supabase.storage.from("factures").getPublicUrl(fileName);

                  await supabase.from("factures").update({ pdf_url: publicUrl }).eq("id", facture.id);

                  console.log("✔️ Facture démarche créée :", facture.numero);
                }
              }
            }
          } catch (err) {
            console.error("❌ Erreur facture démarche:", err);
          }
        }

        // Notification interne
        await supabase.from("notifications").insert({
          garage_id: garageId,
          demarche_id: demarcheId,
          type: "payment_confirmed",
          message: `Votre paiement de ${(paymentIntent.amount / 100).toFixed(
            2,
          )}€ a été validé. Votre démarche est en cours de traitement.`,
        });

        // Envoi d'email de confirmation si demarche est disponible
        if (demarche && demarche.garages) {
          console.log("📧 Envoi email payment_confirmed pour démarche à:", demarche.garages.email);
          try {
            const emailResult = await supabase.functions.invoke("send-email", {
              body: {
                type: "demarche_payment_confirmed",
                to: demarche.garages.email,
                data: {
                  customerName: demarche.garages.raison_sociale,
                  immatriculation: demarche.immatriculation,
                  demarcheId: demarche.numero_demarche || demarcheId,
                  montantTTC: (paymentIntent.amount / 100).toFixed(2),
                },
              },
            });
            
            if (emailResult.error) {
              console.error("❌ Erreur envoi email:", emailResult.error);
            } else {
              console.log("✅ Email payment_confirmed envoyé avec succès:", emailResult);
            }
          } catch (emailError) {
            console.error("❌ Exception envoi email:", emailError);
          }
        }

        console.log("✔️ Démarche traitée :", demarcheId);
      }

      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object;

      await supabase.from("paiements").update({ status: "refuse" }).eq("stripe_payment_id", paymentIntent.id);

      console.log("❌ Paiement échoué :", paymentIntent.id);
      break;
    }

    default:
      console.log("ℹ️ Événement ignoré :", event.type);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
