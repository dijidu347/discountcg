import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe?target=deno";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

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
// PDF GENERATORS
// -----------------------------

async function generateDemarcheFacturePDF(facture: any, demarche: any, garage: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  const blue = rgb(0.145, 0.388, 0.922); // #2563eb
  const black = rgb(0, 0, 0);
  const gray = rgb(0.4, 0.4, 0.4);
  const lightGray = rgb(0.95, 0.96, 0.98);
  const green = rgb(0.02, 0.59, 0.41);
  
  const margin = 50;
  let y = height - margin;
  
  // Header
  page.drawText("DiscountCarteGrise", { x: margin, y, size: 24, font: fontBold, color: blue });
  
  const date = new Date(facture.created_at).toLocaleDateString("fr-FR");
  page.drawText(`Facture N° ${facture.numero}`, { x: width - margin - 180, y, size: 16, font: fontBold, color: blue });
  y -= 20;
  page.drawText(`Date : ${date}`, { x: width - margin - 180, y, size: 10, font: fontRegular, color: gray });
  
  // Blue line
  y -= 30;
  page.drawRectangle({ x: margin, y, width: width - 2 * margin, height: 3, color: blue });
  
  // Parties
  y -= 40;
  page.drawText("ÉMETTEUR", { x: margin, y, size: 10, font: fontBold, color: gray });
  page.drawText("CLIENT", { x: width / 2, y, size: 10, font: fontBold, color: gray });
  
  y -= 20;
  page.drawText("DiscountCarteGrise", { x: margin, y, size: 12, font: fontBold, color: black });
  page.drawText(garage?.raison_sociale || "Client", { x: width / 2, y, size: 12, font: fontBold, color: black });
  
  y -= 15;
  page.drawText("Service de cartes grises", { x: margin, y, size: 10, font: fontRegular, color: gray });
  page.drawText(garage?.adresse || "", { x: width / 2, y, size: 10, font: fontRegular, color: gray });
  
  y -= 12;
  page.drawText("SIRET : 123 456 789 00012", { x: margin, y, size: 10, font: fontRegular, color: gray });
  page.drawText(`${garage?.code_postal || ""} ${garage?.ville || ""}`, { x: width / 2, y, size: 10, font: fontRegular, color: gray });
  
  y -= 12;
  page.drawText("contact@discountcartegrise.fr", { x: margin, y, size: 10, font: fontRegular, color: gray });
  page.drawText(`SIRET : ${garage?.siret || "N/A"}`, { x: width / 2, y, size: 10, font: fontRegular, color: gray });
  
  y -= 12;
  page.drawText(garage?.email || "", { x: width / 2, y, size: 10, font: fontRegular, color: gray });
  
  // Détails box
  y -= 40;
  page.drawRectangle({ x: margin, y: y - 70, width: width - 2 * margin, height: 80, color: lightGray });
  
  y -= 10;
  page.drawText("Détails de la démarche", { x: margin + 15, y, size: 12, font: fontBold, color: blue });
  
  y -= 20;
  page.drawText("N° Démarche :", { x: margin + 15, y, size: 10, font: fontRegular, color: gray });
  page.drawText(demarche?.numero_demarche || "N/A", { x: margin + 150, y, size: 10, font: fontBold, color: black });
  
  y -= 15;
  page.drawText("Immatriculation :", { x: margin + 15, y, size: 10, font: fontRegular, color: gray });
  page.drawText(demarche?.immatriculation || "N/A", { x: margin + 150, y, size: 10, font: fontBold, color: black });
  
  y -= 15;
  page.drawText("Type :", { x: margin + 15, y, size: 10, font: fontRegular, color: gray });
  page.drawText(demarche?.type || "N/A", { x: margin + 150, y, size: 10, font: fontBold, color: black });
  
  // Table header
  y -= 50;
  page.drawRectangle({ x: margin, y: y - 5, width: width - 2 * margin, height: 25, color: blue });
  page.drawText("Description", { x: margin + 10, y: y, size: 10, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText("Qté", { x: width - margin - 150, y: y, size: 10, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText("Prix HT", { x: width - margin - 70, y: y, size: 10, font: fontBold, color: rgb(1, 1, 1) });
  
  // Table row
  y -= 35;
  const montantHT = Number(facture.montant_ht).toFixed(2);
  page.drawText(`Démarche carte grise - ${demarche?.type || "Standard"}`, { x: margin + 10, y, size: 10, font: fontRegular, color: black });
  page.drawText("1", { x: width - margin - 145, y, size: 10, font: fontRegular, color: black });
  page.drawText(`${montantHT} €`, { x: width - margin - 70, y, size: 10, font: fontRegular, color: black });
  
  y -= 12;
  page.drawText(`Immatriculation : ${demarche?.immatriculation || "N/A"}`, { x: margin + 10, y, size: 8, font: fontRegular, color: gray });
  
  // Line
  y -= 10;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.9, 0.9, 0.9) });
  
  // Totals
  const montantTVA = (Number(facture.montant_ttc) - Number(facture.montant_ht)).toFixed(2);
  const montantTTC = Number(facture.montant_ttc).toFixed(2);
  
  y -= 30;
  page.drawText("Total HT", { x: width - margin - 180, y, size: 10, font: fontRegular, color: black });
  page.drawText(`${montantHT} €`, { x: width - margin - 70, y, size: 10, font: fontRegular, color: black });
  
  y -= 18;
  page.drawText("TVA (20%)", { x: width - margin - 180, y, size: 10, font: fontRegular, color: black });
  page.drawText(`${montantTVA} €`, { x: width - margin - 70, y, size: 10, font: fontRegular, color: black });
  
  y -= 5;
  page.drawLine({ start: { x: width - margin - 200, y }, end: { x: width - margin, y }, thickness: 2, color: blue });
  
  y -= 20;
  page.drawText("Total TTC", { x: width - margin - 180, y, size: 14, font: fontBold, color: blue });
  page.drawText(`${montantTTC} €`, { x: width - margin - 70, y, size: 14, font: fontBold, color: blue });
  
  // Payment info
  y -= 50;
  page.drawRectangle({ x: margin, y: y - 25, width: width - 2 * margin, height: 40, color: rgb(0.93, 0.99, 0.96) });
  y -= 5;
  page.drawText("✓ Paiement reçu", { x: margin + 15, y, size: 11, font: fontBold, color: green });
  y -= 15;
  page.drawText("Paiement effectué par carte bancaire via Stripe", { x: margin + 15, y, size: 9, font: fontRegular, color: gray });
  
  // Footer
  y = margin + 40;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.9, 0.9, 0.9) });
  y -= 15;
  page.drawText("DiscountCarteGrise - Service agréé de cartes grises", { x: width / 2 - 120, y, size: 9, font: fontRegular, color: gray });
  y -= 12;
  page.drawText("Cette facture a été générée automatiquement et est valable sans signature.", { x: width / 2 - 160, y, size: 8, font: fontRegular, color: gray });
  
  return await pdfDoc.save();
}

async function generateGuestOrderFacturePDF(facture: any, order: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  const blue = rgb(0.145, 0.388, 0.922);
  const black = rgb(0, 0, 0);
  const gray = rgb(0.4, 0.4, 0.4);
  const lightGray = rgb(0.95, 0.96, 0.98);
  const green = rgb(0.02, 0.59, 0.41);
  
  const margin = 50;
  let y = height - margin;
  
  // Header
  page.drawText("DiscountCarteGrise", { x: margin, y, size: 24, font: fontBold, color: blue });
  
  const date = new Date(facture.created_at).toLocaleDateString("fr-FR");
  page.drawText(`Facture N° ${facture.numero}`, { x: width - margin - 180, y, size: 16, font: fontBold, color: blue });
  y -= 20;
  page.drawText(`Date : ${date}`, { x: width - margin - 180, y, size: 10, font: fontRegular, color: gray });
  
  // Blue line
  y -= 30;
  page.drawRectangle({ x: margin, y, width: width - 2 * margin, height: 3, color: blue });
  
  // Parties
  y -= 40;
  page.drawText("ÉMETTEUR", { x: margin, y, size: 10, font: fontBold, color: gray });
  page.drawText("CLIENT", { x: width / 2, y, size: 10, font: fontBold, color: gray });
  
  y -= 20;
  page.drawText("DiscountCarteGrise", { x: margin, y, size: 12, font: fontBold, color: black });
  page.drawText(`${order?.prenom || ""} ${order?.nom || ""}`, { x: width / 2, y, size: 12, font: fontBold, color: black });
  
  y -= 15;
  page.drawText("Service de cartes grises", { x: margin, y, size: 10, font: fontRegular, color: gray });
  page.drawText(order?.adresse || "", { x: width / 2, y, size: 10, font: fontRegular, color: gray });
  
  y -= 12;
  page.drawText("SIRET : 123 456 789 00012", { x: margin, y, size: 10, font: fontRegular, color: gray });
  page.drawText(`${order?.code_postal || ""} ${order?.ville || ""}`, { x: width / 2, y, size: 10, font: fontRegular, color: gray });
  
  y -= 12;
  page.drawText("contact@discountcartegrise.fr", { x: margin, y, size: 10, font: fontRegular, color: gray });
  page.drawText(order?.email || "", { x: width / 2, y, size: 10, font: fontRegular, color: gray });
  
  y -= 12;
  page.drawText(order?.telephone || "", { x: width / 2, y, size: 10, font: fontRegular, color: gray });
  
  // Détails box
  y -= 40;
  page.drawRectangle({ x: margin, y: y - 70, width: width - 2 * margin, height: 80, color: lightGray });
  
  y -= 10;
  page.drawText("Détails de la commande", { x: margin + 15, y, size: 12, font: fontBold, color: blue });
  
  y -= 20;
  page.drawText("N° Suivi :", { x: margin + 15, y, size: 10, font: fontRegular, color: gray });
  page.drawText(order?.tracking_number || "N/A", { x: margin + 150, y, size: 10, font: fontBold, color: black });
  
  y -= 15;
  page.drawText("Immatriculation :", { x: margin + 15, y, size: 10, font: fontRegular, color: gray });
  page.drawText(order?.immatriculation || "N/A", { x: margin + 150, y, size: 10, font: fontBold, color: black });
  
  y -= 15;
  page.drawText("Véhicule :", { x: margin + 15, y, size: 10, font: fontRegular, color: gray });
  page.drawText(`${order?.marque || ""} ${order?.modele || ""}`, { x: margin + 150, y, size: 10, font: fontBold, color: black });
  
  // Table header
  y -= 50;
  page.drawRectangle({ x: margin, y: y - 5, width: width - 2 * margin, height: 25, color: blue });
  page.drawText("Description", { x: margin + 10, y: y, size: 10, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText("Qté", { x: width - margin - 150, y: y, size: 10, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText("Prix HT", { x: width - margin - 70, y: y, size: 10, font: fontBold, color: rgb(1, 1, 1) });
  
  // Table row
  y -= 35;
  const montantHT = Number(facture.montant_ht).toFixed(2);
  page.drawText("Changement de titulaire carte grise", { x: margin + 10, y, size: 10, font: fontRegular, color: black });
  page.drawText("1", { x: width - margin - 145, y, size: 10, font: fontRegular, color: black });
  page.drawText(`${montantHT} €`, { x: width - margin - 70, y, size: 10, font: fontRegular, color: black });
  
  y -= 12;
  page.drawText(`Immatriculation : ${order?.immatriculation || "N/A"}`, { x: margin + 10, y, size: 8, font: fontRegular, color: gray });
  
  // Line
  y -= 10;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.9, 0.9, 0.9) });
  
  // Totals
  const montantTVA = (Number(facture.montant_ttc) - Number(facture.montant_ht)).toFixed(2);
  const montantTTC = Number(facture.montant_ttc).toFixed(2);
  
  y -= 30;
  page.drawText("Total HT", { x: width - margin - 180, y, size: 10, font: fontRegular, color: black });
  page.drawText(`${montantHT} €`, { x: width - margin - 70, y, size: 10, font: fontRegular, color: black });
  
  y -= 18;
  page.drawText("TVA (20%)", { x: width - margin - 180, y, size: 10, font: fontRegular, color: black });
  page.drawText(`${montantTVA} €`, { x: width - margin - 70, y, size: 10, font: fontRegular, color: black });
  
  y -= 5;
  page.drawLine({ start: { x: width - margin - 200, y }, end: { x: width - margin, y }, thickness: 2, color: blue });
  
  y -= 20;
  page.drawText("Total TTC", { x: width - margin - 180, y, size: 14, font: fontBold, color: blue });
  page.drawText(`${montantTTC} €`, { x: width - margin - 70, y, size: 14, font: fontBold, color: blue });
  
  // Payment info
  y -= 50;
  page.drawRectangle({ x: margin, y: y - 25, width: width - 2 * margin, height: 40, color: rgb(0.93, 0.99, 0.96) });
  y -= 5;
  page.drawText("✓ Paiement reçu", { x: margin + 15, y, size: 11, font: fontBold, color: green });
  y -= 15;
  page.drawText("Paiement effectué par carte bancaire via Stripe", { x: margin + 15, y, size: 9, font: fontRegular, color: gray });
  
  // Footer
  y = margin + 40;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.9, 0.9, 0.9) });
  y -= 15;
  page.drawText("DiscountCarteGrise - Service agréé de cartes grises", { x: width / 2 - 120, y, size: 9, font: fontRegular, color: gray });
  y -= 12;
  page.drawText("Cette facture a été générée automatiquement et est valable sans signature.", { x: width / 2 - 160, y, size: 8, font: fontRegular, color: gray });
  
  return await pdfDoc.save();
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
          // FACTURE "guest order" - PDF
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
                const pdfBytes = await generateGuestOrderFacturePDF(facture, order);

                const fileName = `guest-orders/${order.tracking_number}/${facture.numero}.pdf`;

                const { error: uploadError } = await supabase.storage.from("factures").upload(fileName, pdfBytes, {
                  contentType: "application/pdf",
                  upsert: true,
                });

                if (uploadError) {
                  console.error("❌ Erreur upload PDF:", uploadError);
                } else {
                  const {
                    data: { publicUrl },
                  } = supabase.storage.from("factures").getPublicUrl(fileName);

                  await supabase.from("factures").update({ pdf_url: publicUrl }).eq("id", facture.id);

                  console.log("✔️ Facture PDF guest order créée :", facture.numero);
                }
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

        // FACTURE DÉMARCHE - PDF
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
                  const pdfBytes = await generateDemarcheFacturePDF(facture, demarche, demarche.garages);

                  const fileName = `${demarche.garage_id}/${facture.numero}.pdf`;

                  const { error: uploadError } = await supabase.storage.from("factures").upload(fileName, pdfBytes, {
                    contentType: "application/pdf",
                    upsert: true,
                  });

                  if (uploadError) {
                    console.error("❌ Erreur upload PDF:", uploadError);
                  } else {
                    const {
                      data: { publicUrl },
                    } = supabase.storage.from("factures").getPublicUrl(fileName);

                    await supabase.from("factures").update({ pdf_url: publicUrl }).eq("id", facture.id);

                    console.log("✔️ Facture PDF démarche créée :", facture.numero);
                  }
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
