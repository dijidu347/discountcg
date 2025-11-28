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
// HELPER FUNCTIONS
// -----------------------------

// Vérifie si une démarche a le suivi email activé
async function hasEmailTracking(supabaseClient: any, demarcheId: string): Promise<boolean> {
  const { data } = await supabaseClient
    .from("tracking_services")
    .select("service_type")
    .eq("demarche_id", demarcheId)
    .in("service_type", ["email", "email_phone"]);
  
  return data && data.length > 0;
}

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

async function generateGuestOrderFacturePDF(
  facture: any, 
  order: any,
  prixCarteGrise: number,
  fraisDossier: number,
  smsPrice: number
): Promise<Uint8Array> {
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
  page.drawText("EMETTEUR", { x: margin, y, size: 10, font: fontBold, color: gray });
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
  
  // Details box
  y -= 40;
  page.drawRectangle({ x: margin, y: y - 70, width: width - 2 * margin, height: 80, color: lightGray });
  
  y -= 10;
  page.drawText("Details de la commande", { x: margin + 15, y, size: 12, font: fontBold, color: blue });
  
  y -= 20;
  page.drawText("N Suivi :", { x: margin + 15, y, size: 10, font: fontRegular, color: gray });
  page.drawText(order?.tracking_number || "N/A", { x: margin + 150, y, size: 10, font: fontBold, color: black });
  
  y -= 15;
  page.drawText("Immatriculation :", { x: margin + 15, y, size: 10, font: fontRegular, color: gray });
  page.drawText(order?.immatriculation || "N/A", { x: margin + 150, y, size: 10, font: fontBold, color: black });
  
  y -= 15;
  page.drawText("Vehicule :", { x: margin + 15, y, size: 10, font: fontRegular, color: gray });
  page.drawText(`${order?.marque || ""} ${order?.modele || ""}`, { x: margin + 150, y, size: 10, font: fontBold, color: black });
  
  // =============================================
  // SECTION 1: CARTE GRISE (exonérée TVA)
  // =============================================
  if (prixCarteGrise > 0) {
    y -= 40;
    page.drawText("CARTE GRISE (exoneree TVA)", { x: margin, y, size: 11, font: fontBold, color: blue });
    
    y -= 25;
    page.drawRectangle({ x: margin, y: y - 5, width: width - 2 * margin, height: 25, color: blue });
    page.drawText("Description", { x: margin + 10, y: y, size: 10, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText("Montant", { x: width - margin - 70, y: y, size: 10, font: fontBold, color: rgb(1, 1, 1) });
    
    y -= 25;
    page.drawText("Taxe regionale", { x: margin + 10, y, size: 10, font: fontRegular, color: black });
    page.drawText(`${prixCarteGrise.toFixed(2)} EUR`, { x: width - margin - 70, y, size: 10, font: fontRegular, color: black });
    
    y -= 8;
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.9, 0.9, 0.9) });
  }
  
  // =============================================
  // SECTION 2: SERVICES (soumis à TVA 20%)
  // =============================================
  const hasServices = fraisDossier > 0 || smsPrice > 0;
  
  if (hasServices) {
    y -= 40;
    page.drawText("SERVICES (soumis a TVA 20%)", { x: margin, y, size: 11, font: fontBold, color: blue });
    
    y -= 25;
    page.drawRectangle({ x: margin, y: y - 5, width: width - 2 * margin, height: 25, color: blue });
    page.drawText("Description", { x: margin + 10, y: y, size: 10, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText("Prix HT", { x: width - margin - 70, y: y, size: 10, font: fontBold, color: rgb(1, 1, 1) });
    
    // Frais de dossier
    if (fraisDossier > 0) {
      y -= 25;
      page.drawText("Frais de dossier", { x: margin + 10, y, size: 10, font: fontRegular, color: black });
      page.drawText(`${fraisDossier.toFixed(2)} EUR`, { x: width - margin - 70, y, size: 10, font: fontRegular, color: black });
      
      y -= 8;
      page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.9, 0.9, 0.9) });
    }
    
    // SMS option
    if (smsPrice > 0) {
      y -= 25;
      page.drawText("Suivi par SMS", { x: margin + 10, y, size: 10, font: fontRegular, color: black });
      page.drawText(`${smsPrice.toFixed(2)} EUR`, { x: width - margin - 70, y, size: 10, font: fontRegular, color: black });
      
      y -= 8;
      page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.9, 0.9, 0.9) });
    }
  }
  
  // =============================================
  // SECTION 3: TOTAUX
  // =============================================
  const totalServicesHT = fraisDossier + smsPrice;
  const montantTVA = totalServicesHT * 0.20;
  const montantTTC = prixCarteGrise + totalServicesHT + montantTVA;
  
  y -= 40;
  page.drawRectangle({ x: width - margin - 220, y: y - 75, width: 220, height: 90, color: lightGray });
  
  y -= 10;
  if (prixCarteGrise > 0) {
    page.drawText("Carte grise (exoneree TVA)", { x: width - margin - 210, y, size: 10, font: fontRegular, color: gray });
    page.drawText(`${prixCarteGrise.toFixed(2)} EUR`, { x: width - margin - 70, y, size: 10, font: fontRegular, color: black });
    y -= 15;
  }
  
  page.drawText("Total HT (services)", { x: width - margin - 210, y, size: 10, font: fontRegular, color: black });
  page.drawText(`${totalServicesHT.toFixed(2)} EUR`, { x: width - margin - 70, y, size: 10, font: fontRegular, color: black });
  
  y -= 15;
  page.drawText("TVA 20%", { x: width - margin - 210, y, size: 10, font: fontRegular, color: black });
  page.drawText(`${montantTVA.toFixed(2)} EUR`, { x: width - margin - 70, y, size: 10, font: fontRegular, color: black });
  
  y -= 5;
  page.drawLine({ start: { x: width - margin - 210, y }, end: { x: width - margin, y }, thickness: 2, color: blue });
  
  y -= 20;
  page.drawText("TOTAL TTC", { x: width - margin - 210, y, size: 14, font: fontBold, color: blue });
  page.drawText(`${montantTTC.toFixed(2)} EUR`, { x: width - margin - 70, y, size: 14, font: fontBold, color: blue });
  
  // Payment info
  y -= 50;
  page.drawRectangle({ x: margin, y: y - 25, width: width - 2 * margin, height: 40, color: rgb(0.93, 0.99, 0.96) });
  y -= 5;
  page.drawText("Paiement recu", { x: margin + 15, y, size: 11, font: fontBold, color: green });
  y -= 15;
  page.drawText("Paiement effectue par carte bancaire via Stripe", { x: margin + 15, y, size: 9, font: fontRegular, color: gray });
  
  // Note about TVA
  y -= 30;
  page.drawText("* La TVA s'applique uniquement sur les frais de dossier et options, pas sur la taxe carte grise.", { x: margin, y, size: 8, font: fontRegular, color: gray });
  
  // Footer
  y = margin + 40;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.9, 0.9, 0.9) });
  y -= 15;
  page.drawText("DiscountCarteGrise - Service agree de cartes grises", { x: width / 2 - 120, y, size: 9, font: fontRegular, color: gray });
  y -= 12;
  page.drawText("Cette facture a ete generee automatiquement et est valable sans signature.", { x: width / 2 - 160, y, size: 8, font: fontRegular, color: gray });
  
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
        // Calculer le TTC correct avant mise à jour
        const { data: orderForCalc } = await supabase.from("guest_orders").select("*").eq("id", guestOrderId).single();
        
        let calculatedTTC = orderForCalc?.montant_ttc || 0;
        if (orderForCalc) {
          const prixCG = Number(orderForCalc.montant_ht) || 0;
          const fraisD = Number(orderForCalc.frais_dossier) || 30;
          const smsP = orderForCalc.sms_notifications ? 5 : 0;
          const servicesHT = fraisD + smsP;
          calculatedTTC = prixCG + servicesHT + (servicesHT * 0.20);
        }
        
        await supabase
          .from("guest_orders")
          .update({
            paye: true,
            paid_at: new Date().toISOString(),
            status: "en_traitement",
            payment_intent_id: paymentIntent.id,
            montant_ttc: calculatedTTC,
          })
          .eq("id", guestOrderId);

        const { data: order } = await supabase.from("guest_orders").select("*").eq("id", guestOrderId).single();

        if (order) {
          // FACTURE "guest order" - PDF avec calcul TVA correct
          let pdfBase64: string | null = null;
          let factureNumero: string | null = null;

          try {
            const { data: numeroData } = await supabase.rpc("generate_facture_numero");

            if (numeroData) {
              const numero = numeroData as string;
              factureNumero = numero;
              
              // Calcul TVA correct pour commandes particuliers
              // montant_ht = prix carte grise (taxe régionale, exonérée TVA)
              // frais_dossier = frais de dossier (soumis à TVA)
              const prixCarteGrise = Number(order.montant_ht) || 0;
              const fraisDossier = Number(order.frais_dossier) || 30;
              const smsPrice = order.sms_notifications ? 5 : 0;
              
              const totalServicesHT = fraisDossier + smsPrice;
              const tva = totalServicesHT * 0.20;
              const montantTTC = prixCarteGrise + totalServicesHT + tva;

              const { data: facture } = await supabase
                .from("factures")
                .insert({
                  numero,
                  guest_order_id: guestOrderId,
                  montant_ht: totalServicesHT, // Services HT uniquement (pas carte grise)
                  montant_ttc: montantTTC,
                  tva: 20,
                })
                .select()
                .single();

              if (facture) {
                const pdfBytes = await generateGuestOrderFacturePDF(
                  facture, 
                  order,
                  prixCarteGrise,
                  fraisDossier,
                  smsPrice
                );

                // Convertir en base64 pour l'email
                const uint8Array = new Uint8Array(pdfBytes);
                let binary = '';
                for (let i = 0; i < uint8Array.length; i++) {
                  binary += String.fromCharCode(uint8Array[i]);
                }
                pdfBase64 = btoa(binary);

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

          // EMAIL avec facture en pièce jointe
          console.log("📧 Vérification email_notifications:", order.email_notifications);
          if (order.email_notifications) {
            // Recalculer le TTC correct pour l'email
            const prixCarteGriseEmail = Number(order.montant_ht) || 0;
            const fraisDossierEmail = Number(order.frais_dossier) || 30;
            const smsPriceEmail = order.sms_notifications ? 5 : 0;
            const totalServicesHTEmail = fraisDossierEmail + smsPriceEmail;
            const tvaEmail = totalServicesHTEmail * 0.20;
            const calculatedTTC = prixCarteGriseEmail + totalServicesHTEmail + tvaEmail;
            
            console.log("📧 Envoi email payment_confirmed à:", order.email);
            try {
              const emailBody: any = {
                type: "payment_confirmed",
                to: order.email,
                data: {
                  tracking_number: order.tracking_number,
                  nom: order.nom,
                  prenom: order.prenom,
                  immatriculation: order.immatriculation,
                  montant_ttc: calculatedTTC,
                },
              };

              // Ajouter la facture en pièce jointe si disponible
              if (pdfBase64 && factureNumero) {
                emailBody.attachments = [
                  {
                    filename: `facture_${factureNumero}.pdf`,
                    content: pdfBase64,
                  },
                ];
                console.log("📎 Facture PDF jointe à l'email");
              }

              const emailResult = await supabase.functions.invoke("send-email", {
                body: emailBody,
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

          // NOTIFICATION ADMIN - Nouvelle commande particulier
          console.log("📧 Envoi notification admin pour nouvelle commande particulier");
          try {
            const adminEmails = ["Discountcg@gmail.com", "dijidu347@gmail.com", "mathieugaillac4@gmail.com"];
            for (const adminEmail of adminEmails) {
              await supabase.functions.invoke("send-email", {
                body: {
                  type: "admin_new_demarche",
                  to: adminEmail,
                  data: {
                    type: "Commande particulier",
                    reference: order.tracking_number,
                    immatriculation: order.immatriculation,
                    client_name: `${order.prenom} ${order.nom}`,
                    montant_ttc: calculatedTTC.toFixed(2),
                    is_free_token: false,
                  },
                },
              });
            }
            console.log("✅ Notifications admin envoyées");
          } catch (adminEmailError) {
            console.error("❌ Erreur envoi notification admin:", adminEmailError);
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

        // Email de confirmation - SEULEMENT si suivi email activé
        if (demarche && demarche.garages) {
          const emailTrackingEnabled = await hasEmailTracking(supabase, demarcheId);
          
          if (emailTrackingEnabled) {
            console.log("📧 Suivi email activé - Envoi email payment_confirmed pour démarche à:", demarche.garages.email);
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
          } else {
            console.log("ℹ️ Suivi email NON activé pour cette démarche - email non envoyé");
          }

          // NOTIFICATION ADMIN - Nouvelle démarche garage payée
          console.log("📧 Envoi notification admin pour nouvelle démarche garage");
          try {
            const adminEmails = ["Discountcg@gmail.com", "dijidu347@gmail.com", "mathieugaillac4@gmail.com"];
            for (const adminEmail of adminEmails) {
              await supabase.functions.invoke("send-email", {
                body: {
                  type: "admin_new_demarche",
                  to: adminEmail,
                  data: {
                    type: `Démarche garage - ${demarche.type}`,
                    reference: demarche.numero_demarche || demarcheId,
                    immatriculation: demarche.immatriculation,
                    client_name: demarche.garages?.raison_sociale || "N/A",
                    montant_ttc: (paymentIntent.amount / 100).toFixed(2),
                    is_free_token: false,
                  },
                },
              });
            }
            console.log("✅ Notifications admin envoyées");
          } catch (adminEmailError) {
            console.error("❌ Erreur envoi notification admin:", adminEmailError);
          }
        }

        console.log("✔️ Démarche traitée :", demarcheId);
      }

      break;
    }

    case "checkout.session.completed": {
      const session = event.data.object;
      const metadata = session.metadata || {};
      
      // Handle guest order resubmission payment
      if (metadata.type === 'resubmission_payment' && metadata.order_id) {
        console.log("📦 Traitement paiement de renvoi pour commande:", metadata.order_id);
        
        const { error: updateError } = await supabase
          .from("guest_orders")
          .update({
            resubmission_paid: true,
            resubmission_payment_intent_id: session.payment_intent,
          })
          .eq("id", metadata.order_id);

        if (updateError) {
          console.error("❌ Erreur mise à jour resubmission_paid:", updateError);
        } else {
          console.log("✔️ Paiement de renvoi validé pour:", metadata.order_id);
          
          // Get order for email
          const { data: order } = await supabase
            .from("guest_orders")
            .select("*")
            .eq("id", metadata.order_id)
            .single();
            
          if (order && order.email_notifications) {
            // Send confirmation email that they can now resubmit
            await supabase.functions.invoke("send-email", {
              body: {
                type: "document_rejected",
                to: order.email,
                data: {
                  tracking_number: order.tracking_number,
                  nom: order.nom,
                  prenom: order.prenom,
                  rejectedDocuments: [{
                    nom: "Paiement de renvoi",
                    raison: "Votre paiement a été accepté. Vous pouvez maintenant renvoyer vos documents."
                  }]
                }
              }
            });
          }
        }
      }
      
      // Handle demarche resubmission payment
      if (metadata.type === 'demarche_resubmission_payment' && metadata.demarche_id) {
        console.log("📦 Traitement paiement de renvoi pour démarche:", metadata.demarche_id);
        
        const { error: updateError } = await supabase
          .from("demarches")
          .update({
            resubmission_paid: true,
            resubmission_payment_intent_id: session.payment_intent,
          })
          .eq("id", metadata.demarche_id);

        if (updateError) {
          console.error("❌ Erreur mise à jour resubmission_paid démarche:", updateError);
        } else {
          console.log("✔️ Paiement de renvoi validé pour démarche:", metadata.demarche_id);
          
          // Get demarche and garage for notification
          const { data: demarche } = await supabase
            .from("demarches")
            .select("*, garages(*)")
            .eq("id", metadata.demarche_id)
            .single();
            
          if (demarche && demarche.garages) {
            // Create notification
            await supabase.from("notifications").insert({
              garage_id: demarche.garage_id,
              demarche_id: metadata.demarche_id,
              type: "resubmission_payment_confirmed",
              message: `Votre paiement de renvoi a été accepté. Vous pouvez maintenant renvoyer vos documents pour la démarche ${demarche.immatriculation}.`,
            });
          }
        }
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
