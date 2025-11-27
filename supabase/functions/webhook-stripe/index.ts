import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe?target=deno";

// Stripe client - Production
const stripe = Stripe(Deno.env.get("STRIPE_SECRET_KEY"), {
  apiVersion: "2023-10-16",
});

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// -----------------------------
// HTML GENERATORS
// -----------------------------

function generateDemarcheFactureHTML(facture: any, demarche: any, garage: any): string {
  const date = new Date(facture.created_at).toLocaleDateString("fr-FR");
  const montantHT = Number(facture.montant_ht).toFixed(2);
  const montantTVA = (Number(facture.montant_ttc) - Number(facture.montant_ht)).toFixed(2);
  const montantTTC = Number(facture.montant_ttc).toFixed(2);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Facture ${facture.numero}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 14px; color: #333; line-height: 1.5; padding: 40px; }
    .container { max-width: 800px; margin: 0 auto; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #2563eb; padding-bottom: 20px; }
    .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
    .invoice-info { text-align: right; }
    .invoice-number { font-size: 20px; font-weight: bold; color: #2563eb; }
    .invoice-date { color: #666; margin-top: 5px; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .party { width: 45%; }
    .party-title { font-size: 12px; text-transform: uppercase; color: #666; margin-bottom: 10px; font-weight: bold; }
    .party-name { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
    .party-details { color: #666; font-size: 13px; }
    .details-box { background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 30px; }
    .details-title { font-weight: bold; margin-bottom: 10px; color: #2563eb; }
    .details-row { display: flex; justify-content: space-between; padding: 5px 0; }
    .details-label { color: #666; }
    .details-value { font-weight: 500; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #2563eb; color: white; padding: 12px; text-align: left; font-weight: 500; }
    td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
    .text-right { text-align: right; }
    .totals { margin-left: auto; width: 300px; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .total-row.final { border-bottom: none; border-top: 2px solid #2563eb; margin-top: 10px; padding-top: 15px; font-size: 18px; font-weight: bold; color: #2563eb; }
    .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #666; text-align: center; }
    .payment-info { background: #ecfdf5; border-radius: 8px; padding: 15px; margin-top: 30px; }
    .payment-title { font-weight: bold; color: #059669; margin-bottom: 5px; }
    @media print { body { padding: 20px; } .container { max-width: 100%; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">DiscountCarteGrise</div>
      <div class="invoice-info">
        <div class="invoice-number">Facture N° ${facture.numero}</div>
        <div class="invoice-date">Date : ${date}</div>
      </div>
    </div>

    <div class="parties">
      <div class="party">
        <div class="party-title">Émetteur</div>
        <div class="party-name">DiscountCarteGrise</div>
        <div class="party-details">
          Service de cartes grises<br>
          SIRET : 123 456 789 00012<br>
          contact@discountcartegrise.fr
        </div>
      </div>
      <div class="party">
        <div class="party-title">Client</div>
        <div class="party-name">${garage?.raison_sociale || 'Client'}</div>
        <div class="party-details">
          ${garage?.adresse || ''}<br>
          ${garage?.code_postal || ''} ${garage?.ville || ''}<br>
          SIRET : ${garage?.siret || 'N/A'}<br>
          ${garage?.email || ''}
        </div>
      </div>
    </div>

    <div class="details-box">
      <div class="details-title">Détails de la démarche</div>
      <div class="details-row">
        <span class="details-label">N° Démarche :</span>
        <span class="details-value">${demarche?.numero_demarche || 'N/A'}</span>
      </div>
      <div class="details-row">
        <span class="details-label">Immatriculation :</span>
        <span class="details-value">${demarche?.immatriculation || 'N/A'}</span>
      </div>
      <div class="details-row">
        <span class="details-label">Type :</span>
        <span class="details-value">${demarche?.type || 'N/A'}</span>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="text-right">Quantité</th>
          <th class="text-right">Prix HT</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Démarche carte grise - ${demarche?.type || 'Standard'}<br><small style="color:#666">Immatriculation : ${demarche?.immatriculation || 'N/A'}</small></td>
          <td class="text-right">1</td>
          <td class="text-right">${montantHT} €</td>
        </tr>
      </tbody>
    </table>

    <div class="totals">
      <div class="total-row">
        <span>Total HT</span>
        <span>${montantHT} €</span>
      </div>
      <div class="total-row">
        <span>TVA (20%)</span>
        <span>${montantTVA} €</span>
      </div>
      <div class="total-row final">
        <span>Total TTC</span>
        <span>${montantTTC} €</span>
      </div>
    </div>

    <div class="payment-info">
      <div class="payment-title">✓ Paiement reçu</div>
      <div>Paiement effectué par carte bancaire via Stripe</div>
    </div>

    <div class="footer">
      <p>DiscountCarteGrise - Service agréé de cartes grises</p>
      <p>Cette facture a été générée automatiquement et est valable sans signature.</p>
    </div>
  </div>
</body>
</html>`;
}

function generateGuestOrderFactureHTML(facture: any, order: any): string {
  const date = new Date(facture.created_at).toLocaleDateString("fr-FR");
  const montantHT = Number(facture.montant_ht).toFixed(2);
  const montantTVA = (Number(facture.montant_ttc) - Number(facture.montant_ht)).toFixed(2);
  const montantTTC = Number(facture.montant_ttc).toFixed(2);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Facture ${facture.numero}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 14px; color: #333; line-height: 1.5; padding: 40px; }
    .container { max-width: 800px; margin: 0 auto; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #2563eb; padding-bottom: 20px; }
    .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
    .invoice-info { text-align: right; }
    .invoice-number { font-size: 20px; font-weight: bold; color: #2563eb; }
    .invoice-date { color: #666; margin-top: 5px; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .party { width: 45%; }
    .party-title { font-size: 12px; text-transform: uppercase; color: #666; margin-bottom: 10px; font-weight: bold; }
    .party-name { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
    .party-details { color: #666; font-size: 13px; }
    .details-box { background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 30px; }
    .details-title { font-weight: bold; margin-bottom: 10px; color: #2563eb; }
    .details-row { display: flex; justify-content: space-between; padding: 5px 0; }
    .details-label { color: #666; }
    .details-value { font-weight: 500; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #2563eb; color: white; padding: 12px; text-align: left; font-weight: 500; }
    td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
    .text-right { text-align: right; }
    .totals { margin-left: auto; width: 300px; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .total-row.final { border-bottom: none; border-top: 2px solid #2563eb; margin-top: 10px; padding-top: 15px; font-size: 18px; font-weight: bold; color: #2563eb; }
    .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #666; text-align: center; }
    .payment-info { background: #ecfdf5; border-radius: 8px; padding: 15px; margin-top: 30px; }
    .payment-title { font-weight: bold; color: #059669; margin-bottom: 5px; }
    @media print { body { padding: 20px; } .container { max-width: 100%; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">DiscountCarteGrise</div>
      <div class="invoice-info">
        <div class="invoice-number">Facture N° ${facture.numero}</div>
        <div class="invoice-date">Date : ${date}</div>
      </div>
    </div>

    <div class="parties">
      <div class="party">
        <div class="party-title">Émetteur</div>
        <div class="party-name">DiscountCarteGrise</div>
        <div class="party-details">
          Service de cartes grises<br>
          SIRET : 123 456 789 00012<br>
          contact@discountcartegrise.fr
        </div>
      </div>
      <div class="party">
        <div class="party-title">Client</div>
        <div class="party-name">${order?.prenom || ''} ${order?.nom || ''}</div>
        <div class="party-details">
          ${order?.adresse || ''}<br>
          ${order?.code_postal || ''} ${order?.ville || ''}<br>
          ${order?.email || ''}<br>
          ${order?.telephone || ''}
        </div>
      </div>
    </div>

    <div class="details-box">
      <div class="details-title">Détails de la commande</div>
      <div class="details-row">
        <span class="details-label">N° Suivi :</span>
        <span class="details-value">${order?.tracking_number || 'N/A'}</span>
      </div>
      <div class="details-row">
        <span class="details-label">Immatriculation :</span>
        <span class="details-value">${order?.immatriculation || 'N/A'}</span>
      </div>
      <div class="details-row">
        <span class="details-label">Véhicule :</span>
        <span class="details-value">${order?.marque || ''} ${order?.modele || ''}</span>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="text-right">Quantité</th>
          <th class="text-right">Prix HT</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Changement de titulaire carte grise<br><small style="color:#666">Immatriculation : ${order?.immatriculation || 'N/A'}</small></td>
          <td class="text-right">1</td>
          <td class="text-right">${montantHT} €</td>
        </tr>
      </tbody>
    </table>

    <div class="totals">
      <div class="total-row">
        <span>Total HT</span>
        <span>${montantHT} €</span>
      </div>
      <div class="total-row">
        <span>TVA (20%)</span>
        <span>${montantTVA} €</span>
      </div>
      <div class="total-row final">
        <span>Total TTC</span>
        <span>${montantTTC} €</span>
      </div>
    </div>

    <div class="payment-info">
      <div class="payment-title">✓ Paiement reçu</div>
      <div>Paiement effectué par carte bancaire via Stripe</div>
    </div>

    <div class="footer">
      <p>DiscountCarteGrise - Service agréé de cartes grises</p>
      <p>Cette facture a été générée automatiquement et est valable sans signature.</p>
    </div>
  </div>
</body>
</html>`;
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

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object;
      const demarcheId = paymentIntent.metadata.demarche_id;
      const garageId = paymentIntent.metadata.garage_id;
      const guestOrderId = paymentIntent.metadata.guest_order_id;

      // -----------------------------------
      // GESTION DES "guest_orders"
      // -----------------------------------
      if (guestOrderId) {
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
          // FACTURE "guest order"
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

          // EMAIL
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
      // GESTION DÉMARCHE NORMALE
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

        const { data: demarche } = await supabase
          .from("demarches")
          .select("*, garages(*)")
          .eq("id", demarcheId)
          .single();

        // FACTURE DÉMARCHE
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

        // Email de confirmation
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
