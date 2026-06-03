import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

// Types
interface Demarche {
  id: string;
  numero_demarche: string;
  garage_id: string;
  immatriculation: string;
  type: string;
  montant_ttc: number;
  montant_ht: number;
  frais_dossier: number;
  prix_carte_grise: number;
  is_free_token?: boolean;
}

// Note: TVA désactivée - tous les prix sont HT

interface Garage {
  id: string;
  raison_sociale: string;
  email: string;
  adresse: string;
  code_postal: string;
  ville: string;
  siret: string;
}

interface GuestOrder {
  id: string;
  tracking_number: string;
  email: string;
  nom: string;
  prenom: string;
  immatriculation: string;
  montant_ttc: number;
  montant_ht: number;
  frais_dossier: number;
  demarche_type: string;
  email_notifications: boolean;
}

interface Facture {
  id: string;
  numero: string;
  montant_ht: number;
  montant_ttc: number;
  tva: number;
  created_at: string;
  demarche_id?: string;
  guest_order_id?: string;
  garage_id?: string;
}

// Stripe clients - Production
// Stripe 1: frais de dossier (pro split, tokens, resubmissions)
const stripe1 = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});
const webhookSecret1 = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

// Stripe 2: carte grise fees (pro_pays_all, client payments, guest orders)
const stripe2 = new Stripe(Deno.env.get("STRIPE_SECRET_KEY_2") || "", {
  apiVersion: "2023-10-16",
});
const webhookSecret2 = Deno.env.get("STRIPE_WEBHOOK_SECRET_2") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Admin emails for notifications
const ADMIN_EMAILS = [
  "contact@discountcartegrise.fr"
];

// -----------------------------
// HELPER FUNCTIONS
// -----------------------------

// Delay function to avoid Resend rate limiting (2 req/sec)
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function hasEmailTracking(supabaseClient: SupabaseClient, demarcheId: string): Promise<boolean> {
  const { data } = await supabaseClient
    .from("tracking_services")
    .select("service_type")
    .eq("demarche_id", demarcheId)
    .in("service_type", ["email", "email_phone"]);

  return data !== null && data.length > 0;
}

// Convert Uint8Array PDF bytes to base64 string
function pdfToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function sendEmail(
  type: string,
  to: string,
  data: Record<string, unknown>,
  attachments?: Array<{ filename: string; content: string }>
): Promise<void> {
  try {
    console.log(`📧 Sending email type: ${type} to: ${to}`);

    // Use service role key for internal service-to-service authentication
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const response = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceRoleKey}`,
          "apikey": serviceRoleKey,
        },
        body: JSON.stringify({ type, to, data, attachments }),
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Email send failed:", errorText);
    } else {
      console.log("✅ Email sent successfully to", to);
    }
  } catch (error) {
    console.error("❌ Error sending email:", error);
  }
}

// -----------------------------
// PDF GENERATOR FOR DEMARCHES
// -----------------------------

async function generateDemarcheFacturePDF(
  facture: Facture, 
  demarche: Demarche, 
  garage: Garage
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const blue = rgb(0.145, 0.388, 0.922);
  const black = rgb(0, 0, 0);
  const gray = rgb(0.4, 0.4, 0.4);
  const lightGray = rgb(0.95, 0.96, 0.98);

  const margin = 50;
  let y = height - margin;

  // Header
  page.drawText("DISCOUNT DRIVER", { x: margin, y, size: 24, font: fontBold, color: blue });

  const date = new Date(facture.created_at).toLocaleDateString("fr-FR");
  page.drawText(`Facture N° ${facture.numero}`, { x: width - margin - 180, y, size: 16, font: fontBold, color: blue });

  y -= 20;
  page.drawText(`Date : ${date}`, { x: width - margin - 180, y, size: 10, font: fontRegular, color: gray });

  y -= 30;
  page.drawRectangle({ x: margin, y, width: width - 2 * margin, height: 3, color: blue });

  // Émetteur / Client
  y -= 40;
  page.drawText("ÉMETTEUR", { x: margin, y, size: 10, font: fontBold, color: gray });
  page.drawText("CLIENT", { x: width / 2, y, size: 10, font: fontBold, color: gray });

  y -= 20;
  page.drawText("DISCOUNT DRIVER", { x: margin, y, size: 12, font: fontBold, color: black });
  page.drawText(garage?.raison_sociale || "Client", { x: width / 2, y, size: 12, font: fontBold, color: black });

  y -= 15;
  page.drawText("SAS - Service de cartes grises en ligne", { x: margin, y, size: 10, font: fontRegular, color: gray });
  page.drawText(garage?.adresse || "", { x: width / 2, y, size: 10, font: fontRegular, color: gray });

  y -= 12;
  page.drawText("SIRET : 820 073 484 00017", { x: margin, y, size: 10, font: fontRegular, color: gray });
  page.drawText(`${garage?.code_postal || ""} ${garage?.ville || ""}`, { x: width / 2, y, size: 10, font: fontRegular, color: gray });

  y -= 12;
  page.drawText("24 RUE DU CROUZET, 34770 GIGEAN", { x: margin, y, size: 10, font: fontRegular, color: gray });
  page.drawText(`SIRET : ${garage?.siret || "N/A"}`, { x: width / 2, y, size: 10, font: fontRegular, color: gray });

  y -= 12;
  page.drawText("contact@discountcartegrise.fr", { x: margin, y, size: 10, font: fontRegular, color: gray });

  y -= 12;
  page.drawText(garage?.email || "", { x: width / 2, y, size: 10, font: fontRegular, color: gray });

  // Détails de la démarche
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

  // Tableau des montants
  y -= 60;
  const tableTop = y;
  const rowHeight = 25;
  const col1 = margin;
  const col2 = width - margin - 100;

  page.drawRectangle({ x: col1, y: tableTop - rowHeight, width: width - 2 * margin, height: rowHeight, color: blue });
  page.drawText("Description", { x: col1 + 10, y: tableTop - 17, size: 10, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText("Montant", { x: col2 + 10, y: tableTop - 17, size: 10, font: fontBold, color: rgb(1, 1, 1) });

  y = tableTop - rowHeight;

  // Prix carte grise
  if (demarche?.prix_carte_grise && demarche.prix_carte_grise > 0) {
    y -= rowHeight;
    page.drawText("Carte grise (taxe régionale)", { x: col1 + 10, y: y + 8, size: 10, font: fontRegular, color: black });
    page.drawText(`${demarche.prix_carte_grise.toFixed(2)} €`, { x: col2 + 10, y: y + 8, size: 10, font: fontRegular, color: black });
    page.drawLine({ start: { x: col1, y }, end: { x: width - margin, y }, thickness: 0.5, color: lightGray });
  }

  // Frais de dossier HT
  y -= rowHeight;
  page.drawText("Frais de dossier HT", { x: col1 + 10, y: y + 8, size: 10, font: fontRegular, color: black });
  page.drawText(`${facture.montant_ht.toFixed(2)} €`, { x: col2 + 10, y: y + 8, size: 10, font: fontRegular, color: black });
  page.drawLine({ start: { x: col1, y }, end: { x: width - margin, y }, thickness: 0.5, color: lightGray });

  // TVA désactivée - ne pas afficher

  // Total TTC
  y -= rowHeight;
  page.drawRectangle({ x: col1, y, width: width - 2 * margin, height: rowHeight, color: lightGray });
  page.drawText("TOTAL TTC", { x: col1 + 10, y: y + 8, size: 11, font: fontBold, color: black });
  page.drawText(`${facture.montant_ttc.toFixed(2)} €`, { x: col2 + 10, y: y + 8, size: 11, font: fontBold, color: blue });

  // Footer
  y -= 60;
  page.drawText("Merci pour votre confiance !", { x: margin, y, size: 10, font: fontRegular, color: gray });
  y -= 15;
  page.drawText("DISCOUNT DRIVER - SAS - Service de cartes grises en ligne", { x: margin, y, size: 9, font: fontRegular, color: gray });

  return await pdfDoc.save();
}

// -----------------------------
// PDF GENERATOR FOR GUEST ORDERS
// -----------------------------

async function generateGuestFacturePDF(
  facture: Facture,
  order: GuestOrder
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const blue = rgb(0.145, 0.388, 0.922);
  const black = rgb(0, 0, 0);
  const gray = rgb(0.4, 0.4, 0.4);
  const margin = 50;
  let y = height - margin;

  page.drawText("DISCOUNT DRIVER", { x: margin, y, size: 24, font: fontBold, color: blue });
  const date = new Date(facture.created_at).toLocaleDateString("fr-FR");
  page.drawText(`Facture N° ${facture.numero}`, { x: width - margin - 180, y, size: 16, font: fontBold, color: blue });
  y -= 20;
  page.drawText(`Date : ${date}`, { x: width - margin - 180, y, size: 10, font: fontRegular, color: gray });
  y -= 30;
  page.drawRectangle({ x: margin, y, width: width - 2 * margin, height: 3, color: blue });

  y -= 40;
  page.drawText("ÉMETTEUR", { x: margin, y, size: 10, font: fontBold, color: gray });
  page.drawText("CLIENT", { x: width / 2, y, size: 10, font: fontBold, color: gray });
  y -= 20;
  page.drawText("DISCOUNT DRIVER", { x: margin, y, size: 12, font: fontBold, color: black });
  page.drawText(`${order.prenom} ${order.nom}`, { x: width / 2, y, size: 12, font: fontBold, color: black });
  y -= 18;
  page.drawText("Service de cartes grises en ligne", { x: margin, y, size: 10, font: fontRegular, color: gray });
  page.drawText(order.email, { x: width / 2, y, size: 10, font: fontRegular, color: gray });

  y -= 50;
  page.drawRectangle({ x: margin, y: y - 5, width: width - 2 * margin, height: 28, color: blue });
  page.drawText("DÉSIGNATION", { x: margin + 10, y: y + 8, size: 10, font: fontBold, color: rgb(1,1,1) });
  page.drawText("MONTANT", { x: width - margin - 80, y: y + 8, size: 10, font: fontBold, color: rgb(1,1,1) });

  y -= 35;
  page.drawText(`Carte grise - ${order.immatriculation}`, { x: margin + 10, y: y + 8, size: 10, font: fontRegular, color: black });
  page.drawText(`Réf: ${order.tracking_number}`, { x: margin + 10, y: y - 8, size: 9, font: fontRegular, color: gray });
  page.drawText(`${facture.montant_ttc.toFixed(2)} €`, { x: width - margin - 80, y: y + 8, size: 10, font: fontBold, color: blue });

  y -= 50;
  page.drawRectangle({ x: margin, y: y - 5, width: width - 2 * margin, height: 2, color: gray });
  y -= 25;
  page.drawText("TOTAL TTC", { x: width / 2, y: y + 8, size: 12, font: fontBold, color: black });
  page.drawText(`${facture.montant_ttc.toFixed(2)} €`, { x: width - margin - 80, y: y + 8, size: 14, font: fontBold, color: blue });

  y -= 60;
  page.drawText("Merci pour votre confiance !", { x: margin, y, size: 10, font: fontRegular, color: gray });
  y -= 15;
  page.drawText("DISCOUNT DRIVER - SAS - Service de cartes grises en ligne", { x: margin, y, size: 9, font: fontRegular, color: gray });

  return await pdfDoc.save();
}

// -----------------------------
// PDF GENERATOR FOR TOKEN PURCHASES
// -----------------------------

async function generateTokenFacturePDF(
  facture: Facture,
  garage: Garage,
  creditAmount: number,
  pricePaid: number
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const blue = rgb(0.145, 0.388, 0.922);
  const black = rgb(0, 0, 0);
  const gray = rgb(0.4, 0.4, 0.4);
  const margin = 50;
  let y = height - margin;

  page.drawText("DISCOUNT DRIVER", { x: margin, y, size: 24, font: fontBold, color: blue });
  const date = new Date(facture.created_at).toLocaleDateString("fr-FR");
  page.drawText(`Facture N° ${facture.numero}`, { x: width - margin - 180, y, size: 16, font: fontBold, color: blue });
  y -= 20;
  page.drawText(`Date : ${date}`, { x: width - margin - 180, y, size: 10, font: fontRegular, color: gray });
  y -= 30;
  page.drawRectangle({ x: margin, y, width: width - 2 * margin, height: 3, color: blue });

  y -= 40;
  page.drawText("ÉMETTEUR", { x: margin, y, size: 10, font: fontBold, color: gray });
  page.drawText("CLIENT", { x: width / 2, y, size: 10, font: fontBold, color: gray });
  y -= 20;
  page.drawText("DISCOUNT DRIVER", { x: margin, y, size: 12, font: fontBold, color: black });
  page.drawText(garage.raison_sociale || "Garage", { x: width / 2, y, size: 12, font: fontBold, color: black });
  y -= 18;
  page.drawText("Service de cartes grises en ligne", { x: margin, y, size: 10, font: fontRegular, color: gray });
  page.drawText(garage.email, { x: width / 2, y, size: 10, font: fontRegular, color: gray });
  if (garage.siret) {
    y -= 15;
    page.drawText(`SIRET : ${garage.siret}`, { x: width / 2, y, size: 10, font: fontRegular, color: gray });
  }

  y -= 50;
  page.drawRectangle({ x: margin, y: y - 5, width: width - 2 * margin, height: 28, color: blue });
  page.drawText("DÉSIGNATION", { x: margin + 10, y: y + 8, size: 10, font: fontBold, color: rgb(1,1,1) });
  page.drawText("MONTANT", { x: width - margin - 80, y: y + 8, size: 10, font: fontBold, color: rgb(1,1,1) });

  y -= 35;
  page.drawText(`Recharge de solde — ${creditAmount} €`, { x: margin + 10, y: y + 8, size: 10, font: fontRegular, color: black });
  page.drawText("Crédit utilisable pour démarches carte grise", { x: margin + 10, y: y - 8, size: 9, font: fontRegular, color: gray });
  page.drawText(`${pricePaid.toFixed(2)} €`, { x: width - margin - 80, y: y + 8, size: 10, font: fontBold, color: blue });

  y -= 50;
  page.drawRectangle({ x: margin, y: y - 5, width: width - 2 * margin, height: 2, color: gray });
  y -= 25;
  page.drawText("TOTAL TTC", { x: width / 2, y: y + 8, size: 12, font: fontBold, color: black });
  page.drawText(`${pricePaid.toFixed(2)} €`, { x: width - margin - 80, y: y + 8, size: 14, font: fontBold, color: blue });

  y -= 60;
  page.drawText("Merci pour votre confiance !", { x: margin, y, size: 10, font: fontRegular, color: gray });
  y -= 15;
  page.drawText("DISCOUNT DRIVER - SAS - Service de cartes grises en ligne", { x: margin, y, size: 9, font: fontRegular, color: gray });

  return await pdfDoc.save();
}

// -----------------------------
// DEMARCHE PAYMENT HANDLER
// -----------------------------

async function handleDemarchePayment(
  supabase: SupabaseClient,
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  const demarcheId = paymentIntent.metadata?.demarche_id;
  
  if (!demarcheId) {
    console.log("⚠️ No demarche_id in metadata, checking for guest order...");
    return;
  }

  console.log(`📋 Processing demarche payment: ${demarcheId}`);

  // Fetch demarche with garage and vehicle
  const { data: demarche, error: demarcheError } = await supabase
    .from("demarches")
    .select("*, garages(*), vehicules(immatriculation)")
    .eq("id", demarcheId)
    .single();

  if (demarcheError || !demarche) {
    console.error("❌ Demarche not found:", demarcheError);
    return;
  }

  const garage = demarche.garages as Garage;
  // Resolve TEMP immatriculation
  const realImmat = (demarche.immatriculation === 'TEMP' && (demarche as any).vehicules?.immatriculation)
    ? (demarche as any).vehicules.immatriculation
    : demarche.immatriculation;

  const paymentMode = paymentIntent.metadata?.payment_mode || 'pro_pays_all';
  const actualAmount = paymentIntent.amount / 100;

  // Update demarche based on payment mode
  let updateFields: Record<string, unknown>;
  if (paymentMode === 'split') {
    // Split mode: pro only paid frais dossier — NOT fully paid yet
    updateFields = {
      paye: false,
      status: "en_attente_paiement_client",
      is_draft: false,
      updated_at: new Date().toISOString(),
    };
    console.log("📋 Split mode: pro paid their part, waiting for client");
  } else {
    // pro_pays_all: fully paid
    updateFields = {
      paye: true,
      status: "paye",
      is_draft: false,
      updated_at: new Date().toISOString(),
    };
  }

  const { error: updateError } = await supabase
    .from("demarches")
    .update(updateFields)
    .eq("id", demarcheId);

  if (updateError) {
    console.error("❌ Failed to update demarche:", updateError);
    return;
  }

  console.log("✅ Demarche updated (mode:", paymentMode, ")");

  // Create paiement record (create-payment-intent no longer inserts one)
  const { error: paiementError } = await supabase
    .from("paiements")
    .insert({
      demarche_id: demarcheId,
      garage_id: demarche.garage_id,
      montant: actualAmount,
      status: "valide",
      stripe_payment_id: paymentIntent.id,
      validated_at: new Date().toISOString(),
      payer_type: "pro",
    });

  if (paiementError) {
    console.error("❌ Failed to create paiement:", paiementError);
  }

  // For split mode (pro pays frais dossier only), don't generate facture or send emails yet
  // The full facture will be generated when the client pays their part (handleClientPayment)
  if (paymentMode === 'split') {
    console.log("📋 Split mode: skipping facture & emails — waiting for client payment");
    return;
  }

  // Generate facture number
  const { data: factureNumero } = await supabase.rpc("generate_facture_numero");

  // Create facture using actual payment amount (not stale demarche.montant_ttc)
  const { data: facture, error: factureError } = await supabase
    .from("factures")
    .insert({
      numero: factureNumero,
      demarche_id: demarcheId,
      garage_id: demarche.garage_id,
      montant_ht: actualAmount,
      montant_ttc: actualAmount,
      tva: 0,
    })
    .select()
    .single();

  let demarchePdfAttachment: Array<{ filename: string; content: string }> | undefined;

  if (factureError) {
    console.error("❌ Failed to create facture:", factureError);
  } else {
    console.log("✅ Facture created:", facture?.numero);

    // Generate and upload PDF
    try {
      const pdfBytes = await generateDemarcheFacturePDF(facture, demarche, garage);
      const pdfFileName = `facture_${facture.numero}.pdf`;

      // Keep bytes for email attachment
      demarchePdfAttachment = [{ filename: pdfFileName, content: pdfToBase64(pdfBytes) }];

      const { error: uploadError } = await supabase.storage
        .from("factures")
        .upload(pdfFileName, pdfBytes, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        console.error("❌ PDF upload failed:", uploadError);
      } else {
        // Update facture with PDF URL
        const { data: { publicUrl } } = supabase.storage
          .from("factures")
          .getPublicUrl(pdfFileName);

        await supabase
          .from("factures")
          .update({ pdf_url: publicUrl })
          .eq("id", facture.id);

        console.log("✅ PDF uploaded:", pdfFileName);
      }
    } catch (pdfError) {
      console.error("❌ PDF generation failed:", pdfError);
    }
  }

  // Update demarche with facture_id
  if (facture) {
    await supabase
      .from("demarches")
      .update({ facture_id: facture.id })
      .eq("id", demarcheId);
  }

  // Send confirmation email to garage WITH invoice attached
  if (garage?.email) {
    await sendEmail("garage_demarche_confirmation", garage.email, {
      type: demarche.type,
      reference: demarche.numero_demarche,
      immatriculation: realImmat,
      garage_name: garage.raison_sociale,
      montant_ttc: actualAmount.toFixed(2),
      is_free_token: demarche.is_free_token || false,
      demarche_id: demarcheId,
    }, demarchePdfAttachment);
    console.log("✅ Confirmation email with invoice sent to garage");
  }

  // Send admin notification emails with delays to avoid rate limiting
  for (let i = 0; i < ADMIN_EMAILS.length; i++) {
    // Wait 600ms between each email to stay under 2 req/sec limit
    await delay(600);

    await sendEmail("admin_new_demarche", ADMIN_EMAILS[i], {
      type: demarche.type,
      reference: demarche.numero_demarche,
      immatriculation: realImmat,
      client_name: garage?.raison_sociale || "N/A",
      montant_ttc: actualAmount.toFixed(2),
      is_free_token: demarche.is_free_token || false,
    });
  }

  console.log("✅ Admin notification emails sent");
}

// -----------------------------
// GUEST ORDER PAYMENT HANDLER
// -----------------------------

async function handleGuestOrderPayment(
  supabase: SupabaseClient,
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  const orderId = paymentIntent.metadata?.guest_order_id;
  
  if (!orderId) {
    console.log("⚠️ No guest_order_id in metadata");
    return;
  }

  console.log(`📋 Processing guest order payment: ${orderId}`);

  // Fetch guest order
  const { data: order, error: orderError } = await supabase
    .from("guest_orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    console.error("❌ Guest order not found:", orderError);
    return;
  }

  // Use Stripe's actual payment amount (authoritative, not stale DB)
  const stripeAmountPaid = paymentIntent.amount / 100; // cents → euros
  console.log(`💰 Stripe amount: ${stripeAmountPaid}€, DB montant_ttc: ${order.montant_ttc}€`);

  // If DB has stale 0€ values, update with Stripe's actual amount
  const actualTTC = (order.montant_ttc && order.montant_ttc > 0) ? order.montant_ttc : stripeAmountPaid;
  const actualHT = (order.montant_ht && order.montant_ht > 0) ? order.montant_ht : Math.max(0, stripeAmountPaid - (order.frais_dossier || 30));

  // Update order as paid + fix amounts if stale
  const { error: updateError } = await supabase
    .from("guest_orders")
    .update({
      paye: true,
      status: "paye",
      paid_at: new Date().toISOString(),
      payment_intent_id: paymentIntent.id,
      montant_ht: actualHT,
      montant_ttc: actualTTC,
      updated_at: new Date().toISOString()
    })
    .eq("id", orderId);

  if (updateError) {
    console.error("❌ Failed to update guest order:", updateError);
    return;
  }

  console.log("✅ Guest order marked as paid, montant_ttc:", actualTTC);

  // Re-fetch order to get the LATEST data (info may have been saved before payment)
  const { data: freshOrder } = await supabase
    .from("guest_orders")
    .select("*")
    .eq("id", orderId)
    .single();

  // Use freshOrder if available, otherwise fallback to original
  const orderData = freshOrder || order;

  // Fallback: get email from Stripe if not in DB
  const stripeEmail = paymentIntent.receipt_email
    || paymentIntent.charges?.data?.[0]?.billing_details?.email
    || null;

  // Use the best available email: DB first, then Stripe fallback
  const clientEmail = orderData.email || stripeEmail || "";

  // If we got email from Stripe but not in DB, save it
  if (!orderData.email && clientEmail) {
    console.log("📧 Email missing in DB, using Stripe email:", clientEmail);
    await supabase.from("guest_orders")
      .update({ email: clientEmail, updated_at: new Date().toISOString() })
      .eq("id", orderId);
  }

  // Create/link auth account for guest order user
  try {
    // Try to find existing user by email via listUsers
    let existingUser = null;
    if (clientEmail) {
      const { data: listData } = await supabase.auth.admin.listUsers();
      existingUser = listData?.users?.find((u: any) => u.email === clientEmail) ?? null;
    }
    let userId: string | null = null;

    if (existingUser) {
      userId = existingUser.id;
      console.log("✅ Found existing user:", userId);
    }

    // If no user found, create one with auto-generated password
    if (!userId) {
      const tempPassword = Math.random().toString(36).slice(-12) + "Aa1!";
      const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
        email: clientEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          account_type: "particulier",
          full_name: `${orderData.prenom || ""} ${orderData.nom || ""}`.trim() || "Client",
        },
      });

      if (!createUserError && newUser) {
        userId = newUser.user!.id;
        console.log("✅ Created new user:", userId);
      } else {
        console.error("⚠️ Failed to create user:", createUserError?.message);
      }
    }

    // Link guest order to user
    if (userId) {
      await supabase
        .from("guest_orders")
        .update({ user_id: userId })
        .eq("id", orderId);

      // Create/update particulier_profiles with fresh data
      await supabase
        .from("particulier_profiles")
        .upsert({
          user_id: userId,
          email: clientEmail,
          nom: orderData.nom || "",
          prenom: orderData.prenom || "",
          telephone: orderData.telephone || "",
        }, { onConflict: "user_id" });

      // Ensure particulier role exists
      await supabase
        .from("user_roles")
        .upsert({ user_id: userId, role: "particulier" as any }, { onConflict: "user_id,role" });

      console.log("✅ User linked to guest order");
    }
  } catch (authError) {
    console.error("⚠️ Failed to create/link user account:", authError);
  }

  // Generate facture number
  const { data: factureNumero, error: rpcError } = await supabase.rpc("generate_facture_numero");
  if (rpcError) {
    console.error("❌ Failed to generate facture numero:", rpcError);
  }

  // Create facture using ACTUAL amounts (not stale DB values)
  const { data: facture, error: factureError } = await supabase
    .from("factures")
    .insert({
      numero: factureNumero,
      guest_order_id: orderId,
      montant_ht: actualHT,
      montant_ttc: actualTTC,
      tva: 0,
    })
    .select()
    .single();

  let guestPdfAttachment: Array<{ filename: string; content: string }> | undefined;

  if (factureError) {
    console.error("❌ Failed to create facture:", factureError);
  } else {
    console.log("✅ Facture created:", facture?.numero);

    // Generate and upload guest order PDF
    try {
      const pdfBytes = await generateGuestFacturePDF(facture, { ...orderData, email: clientEmail });
      const pdfFileName = `facture_${facture.numero}.pdf`;

      guestPdfAttachment = [{ filename: pdfFileName, content: pdfToBase64(pdfBytes) }];

      const { error: uploadError } = await supabase.storage
        .from("factures")
        .upload(pdfFileName, pdfBytes, { contentType: "application/pdf", upsert: true });

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from("factures").getPublicUrl(pdfFileName);
        await supabase.from("factures").update({ pdf_url: publicUrl }).eq("id", facture.id);
        console.log("✅ Guest PDF uploaded:", pdfFileName);
      }
    } catch (pdfError) {
      console.error("❌ Guest PDF generation failed:", pdfError);
    }
  }

  // Send client confirmation email WITH invoice attached
  if (clientEmail) {
    try {
      const trackingUrl = `https://discountcartegrise.fr/suivi/${orderData.tracking_number}`;
      await sendEmail("payment_confirmed", clientEmail, {
        tracking_number: orderData.tracking_number,
        prenom: orderData.prenom || "Client",
        nom: orderData.nom || "",
        immatriculation: orderData.immatriculation,
        montant_ttc: actualTTC.toFixed(2),
        tracking_url: trackingUrl,
      }, guestPdfAttachment);
      console.log("✅ Client confirmation email with invoice sent to:", clientEmail);
    } catch (emailError) {
      console.error("❌ Failed to send client confirmation email:", emailError);
    }
  } else {
    console.error("❌ CRITICAL: No email available for client! Order:", orderId, "Tracking:", orderData.tracking_number);
  }

  // Send admin notification emails with FRESH data
  const clientName = `${orderData.prenom || ""} ${orderData.nom || ""}`.trim() || clientEmail || "Client";
  for (let i = 0; i < ADMIN_EMAILS.length; i++) {
    await delay(600);
    try {
      await sendEmail("admin_new_guest_order", ADMIN_EMAILS[i], {
        client_name: clientName,
        client_email: clientEmail || "Non renseigné",
        client_phone: orderData.telephone || "Non renseigné",
        tracking_number: orderData.tracking_number,
        immatriculation: orderData.immatriculation,
        demarche_type: orderData.demarche_type || "CG",
        order_id: orderData.id,
        documents_count: 0,
        montant_ttc: actualTTC.toFixed(2),
      });
    } catch (emailError) {
      console.error("❌ Failed to send admin notification:", emailError);
    }
  }

  console.log("✅ Admin notification emails sent");
}

// -----------------------------
// TOKEN PURCHASE HANDLER
// -----------------------------

async function handleTokenPurchase(
  supabase: SupabaseClient,
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  const garageId = paymentIntent.metadata?.garage_id;
  const creditAmount = parseInt(paymentIntent.metadata?.quantity || "0"); // Montant à créditer en euros
  
  if (!garageId || !creditAmount) {
    console.log("⚠️ Missing garage_id or quantity in metadata");
    return;
  }

  console.log(`📋 Processing balance recharge: ${creditAmount}€ for garage ${garageId}`);

  // Fetch garage data
  const { data: garage, error: garageError } = await supabase
    .from("garages")
    .select("*")
    .eq("id", garageId)
    .single();

  if (garageError || !garage) {
    console.error("❌ Garage not found:", garageError);
    return;
  }

  // Update garage balance (token_balance stores euros now)
  const newBalance = (garage.token_balance || 0) + creditAmount;
  const { error: updateError } = await supabase
    .from("garages")
    .update({ 
      token_balance: newBalance,
      updated_at: new Date().toISOString()
    })
    .eq("id", garageId);

  if (updateError) {
    console.error("❌ Failed to update balance:", updateError);
    return;
  }

  console.log(`✅ Balance updated: ${newBalance}€`);

  // Record purchase (on récupère l'id pour LIER la facture à l'achat)
  const { data: purchaseRow, error: purchaseError } = await supabase
    .from("token_purchases")
    .insert({
      garage_id: garageId,
      quantity: creditAmount,
      amount: paymentIntent.amount / 100,
      stripe_payment_id: paymentIntent.id,
    })
    .select()
    .single();

  if (purchaseError) {
    console.error("❌ Failed to record purchase:", purchaseError);
  } else {
    console.log("✅ Balance recharge recorded");
  }

  // Send confirmation email to garage WITH invoice attached
  const pricePaid = paymentIntent.amount / 100;

  // Generate token invoice PDF
  let tokenPdfAttachment: Array<{ filename: string; content: string }> | undefined;
  try {
    // Create facture record for tokens — LIÉE au token_purchase pour que la
    // page admin la voie comme "Générée" (sinon token_purchase_id null → "Non générée")
    const { data: factureNumero } = await supabase.rpc("generate_facture_numero");
    const { data: tokenFacture } = await supabase
      .from("factures")
      .insert({
        numero: factureNumero,
        garage_id: garageId,
        token_purchase_id: purchaseRow?.id ?? null,
        montant_ht: pricePaid,
        montant_ttc: pricePaid,
        tva: 0,
      })
      .select()
      .single();

    if (tokenFacture) {
      const pdfBytes = await generateTokenFacturePDF(tokenFacture, garage, creditAmount, pricePaid);
      const pdfFileName = `facture_${tokenFacture.numero}.pdf`;

      tokenPdfAttachment = [{ filename: pdfFileName, content: pdfToBase64(pdfBytes) }];

      const { error: uploadError } = await supabase.storage
        .from("factures")
        .upload(pdfFileName, pdfBytes, { contentType: "application/pdf", upsert: true });

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from("factures").getPublicUrl(pdfFileName);
        await supabase.from("factures").update({ pdf_url: publicUrl }).eq("id", tokenFacture.id);
        console.log("✅ Token invoice PDF uploaded:", pdfFileName);
      }
    }
  } catch (pdfError) {
    console.error("❌ Token PDF generation failed:", pdfError);
  }

  if (garage.email) {
    await sendEmail("recharge_confirmed", garage.email, {
      garage_name: garage.raison_sociale,
      amount: creditAmount,
      price: pricePaid,
      new_balance: newBalance,
    }, tokenPdfAttachment);
    console.log("✅ Recharge confirmation email with invoice sent");
  }

  // Send admin notification emails with proper delays to avoid Resend rate limits (2 req/sec)
  for (let i = 0; i < ADMIN_EMAILS.length; i++) {
    await delay(1000); // Wait 1 second between each email to stay under rate limit
    await sendEmail("admin_balance_recharge", ADMIN_EMAILS[i], {
      garage_name: garage.raison_sociale,
      garage_email: garage.email,
      amount: creditAmount,
      price: pricePaid,
      new_balance: newBalance,
    });
    console.log(`✅ Admin notification email sent to ${ADMIN_EMAILS[i]}`);
  }
  console.log("✅ All admin notification emails sent for balance recharge");
}

// -----------------------------
// CLIENT PAYMENT HANDLER
// -----------------------------

async function handleClientPayment(
  supabase: SupabaseClient,
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  const demarcheId = paymentIntent.metadata?.demarche_id;
  const paymentMode = paymentIntent.metadata?.payment_mode;

  if (!demarcheId) {
    console.log("⚠️ No demarche_id in client payment metadata");
    return;
  }

  console.log(`📋 Processing client payment for demarche: ${demarcheId}, mode: ${paymentMode}`);

  // Fetch demarche with garage and vehicle
  const { data: demarche, error: demarcheError } = await supabase
    .from("demarches")
    .select("*, garages(*), vehicules(immatriculation)")
    .eq("id", demarcheId)
    .single();

  if (demarcheError || !demarche) {
    console.error("❌ Demarche not found:", demarcheError);
    return;
  }

  const garage = demarche.garages as Garage;
  // Resolve TEMP immatriculation from vehicle
  const realImmat = (demarche.immatriculation === 'TEMP' && (demarche as any).vehicules?.immatriculation)
    ? (demarche as any).vehicules.immatriculation
    : demarche.immatriculation;

  // Update demarche: mark client as paid
  const updateFields: Record<string, unknown> = {
    client_paid: true,
    client_paid_at: new Date().toISOString(),
    client_stripe_payment_id: paymentIntent.id,
    updated_at: new Date().toISOString(),
  };

  if (paymentMode === "split") {
    // Split mode: pro already paid, client just paid their part — fully paid now
    updateFields.status = "en_attente";
    updateFields.paye = true;
    updateFields.is_draft = false;
  } else if (paymentMode === "client_pays_all") {
    // Client pays all: fully paid
    updateFields.status = "en_attente";
    updateFields.paye = true;
    updateFields.is_draft = false;
  }

  const { error: updateError } = await supabase
    .from("demarches")
    .update(updateFields)
    .eq("id", demarcheId);

  if (updateError) {
    console.error("❌ Failed to update demarche:", updateError);
    return;
  }

  console.log("✅ Demarche updated with client payment");

  const clientActualAmount = paymentIntent.amount / 100;

  // Create paiement record
  const { error: paiementError } = await supabase
    .from("paiements")
    .insert({
      demarche_id: demarcheId,
      garage_id: demarche.garage_id,
      montant: clientActualAmount,
      status: "valide",
      stripe_payment_id: paymentIntent.id,
      validated_at: new Date().toISOString(),
      payer_type: "client",
    });

  if (paiementError) {
    console.error("❌ Failed to create paiement:", paiementError);
  }

  if (paymentMode === "split" || paymentMode === "client_pays_all") {
    // Full payment by client - create facture and send confirmations

    // Generate facture number
    const { data: factureNumero } = await supabase.rpc("generate_facture_numero");

    // Create facture using actual payment amount
    const { data: facture, error: factureError } = await supabase
      .from("factures")
      .insert({
        numero: factureNumero,
        demarche_id: demarcheId,
        garage_id: demarche.garage_id,
        montant_ht: clientActualAmount,
        montant_ttc: clientActualAmount,
        tva: 0,
      })
      .select()
      .single();

    let clientPdfAttachment: Array<{ filename: string; content: string }> | undefined;

    if (factureError) {
      console.error("❌ Failed to create facture:", factureError);
    } else {
      console.log("✅ Facture created:", facture?.numero);

      // Generate and upload PDF
      try {
        const pdfBytes = await generateDemarcheFacturePDF(facture, demarche, garage);
        const pdfFileName = `facture_${facture.numero}.pdf`;

        // Keep for email attachment
        clientPdfAttachment = [{ filename: pdfFileName, content: pdfToBase64(pdfBytes) }];

        const { error: uploadError } = await supabase.storage
          .from("factures")
          .upload(pdfFileName, pdfBytes, { contentType: "application/pdf", upsert: true });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from("factures").getPublicUrl(pdfFileName);
          await supabase.from("factures").update({ pdf_url: publicUrl }).eq("id", facture.id);
          console.log("✅ PDF uploaded:", pdfFileName);
        }
      } catch (pdfError) {
        console.error("❌ PDF generation failed:", pdfError);
      }
    }

    // Update demarche with facture_id
    if (facture) {
      await supabase
        .from("demarches")
        .update({ facture_id: facture.id })
        .eq("id", demarcheId);
    }

    // Send confirmation email to client AVEC la facture en PJ (tout payeur reçoit sa facture)
    if (demarche.client_email) {
      await sendEmail("client_payment_confirmed", demarche.client_email, {
        immatriculation: realImmat,
        montant_ttc: clientActualAmount.toFixed(2),
        reference: demarche.numero_demarche,
      }, clientPdfAttachment);
      console.log("✅ Client payment confirmation email with invoice sent to", demarche.client_email);
    }

    // Send notification to garage WITH invoice attached
    await delay(600);
    if (garage?.email) {
      await sendEmail("garage_client_paid", garage.email, {
        garage_name: garage.raison_sociale,
        client_email: demarche.client_email || "N/A",
        immatriculation: realImmat,
        montant_ttc: clientActualAmount.toFixed(2),
        reference: demarche.numero_demarche,
        demarche_id: demarcheId,
      }, clientPdfAttachment);
      console.log("✅ Garage notified with invoice: client paid");
    }

    // Insert in-app notification for the garage (realtime NotificationBell)
    const { error: notifError } = await supabase
      .from("notifications")
      .insert({
        garage_id: demarche.garage_id,
        demarche_id: demarcheId,
        type: "client_payment_confirmed",
        message: `Le client a payé ${clientActualAmount.toFixed(2)} € pour la démarche ${demarche.numero_demarche} (${realImmat})`,
      });

    if (notifError) {
      console.error("❌ Failed to insert client_payment_confirmed notification:", notifError);
    } else {
      console.log("✅ Notification client_payment_confirmed inserted for garage");
    }

    // Send admin notification emails
    await delay(600);
    for (let i = 0; i < ADMIN_EMAILS.length; i++) {
      await delay(600);
      await sendEmail("admin_new_demarche", ADMIN_EMAILS[i], {
        type: demarche.type,
        reference: demarche.numero_demarche,
        immatriculation: realImmat,
        client_name: garage?.raison_sociale || "N/A",
        montant_ttc: clientActualAmount.toFixed(2),
        is_free_token: demarche.is_free_token || false,
      });
    }
    console.log("✅ Admin notification emails sent");

  }
}

// -----------------------------
// RESUBMISSION PAYMENT HANDLER
// -----------------------------

async function handleResubmissionPayment(
  supabase: SupabaseClient,
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  const demarcheId = paymentIntent.metadata?.demarche_id;
  const orderId = paymentIntent.metadata?.guest_order_id;
  const isResubmission = paymentIntent.metadata?.is_resubmission === "true";

  if (!isResubmission) return;

  console.log("📋 Processing resubmission payment");
  const actualAmount = paymentIntent.amount / 100;

  if (demarcheId) {
    await supabase
      .from("demarches")
      .update({
        resubmission_paid: true,
        requires_resubmission_payment: false,
        updated_at: new Date().toISOString()
      })
      .eq("id", demarcheId);

    console.log("✅ Demarche resubmission payment processed");

    // Fetch demarche + garage for facture & email
    const { data: demarche } = await supabase
      .from("demarches")
      .select("*, garages(*), vehicules(immatriculation)")
      .eq("id", demarcheId)
      .single();

    if (demarche) {
      const garage = demarche.garages as Garage;
      const realImmat = (demarche.immatriculation === 'TEMP' && (demarche as any).vehicules?.immatriculation)
        ? (demarche as any).vehicules.immatriculation
        : demarche.immatriculation;

      // Create facture
      const { data: factureNumero } = await supabase.rpc("generate_facture_numero");
      const { data: facture, error: factureError } = await supabase
        .from("factures")
        .insert({
          numero: factureNumero,
          demarche_id: demarcheId,
          garage_id: demarche.garage_id,
          montant_ht: actualAmount,
          montant_ttc: actualAmount,
          tva: 0,
        })
        .select()
        .single();

      let pdfAttachment: Array<{ filename: string; content: string }> | undefined;

      if (factureError) {
        console.error("❌ Failed to create resubmission facture:", factureError);
      } else {
        console.log("✅ Resubmission facture created:", facture?.numero);

        try {
          const pdfBytes = await generateDemarcheFacturePDF(facture, demarche, garage);
          const pdfFileName = `facture_${facture.numero}.pdf`;
          pdfAttachment = [{ filename: pdfFileName, content: pdfToBase64(pdfBytes) }];

          const { error: uploadError } = await supabase.storage
            .from("factures")
            .upload(pdfFileName, pdfBytes, { contentType: "application/pdf", upsert: true });

          if (uploadError) {
            console.error("❌ Resubmission PDF upload failed:", uploadError);
          } else {
            const { data: { publicUrl } } = supabase.storage.from("factures").getPublicUrl(pdfFileName);
            await supabase.from("factures").update({ pdf_url: publicUrl }).eq("id", facture.id);
            console.log("✅ Resubmission PDF uploaded:", pdfFileName);
          }
        } catch (pdfError) {
          console.error("❌ Resubmission PDF generation failed:", pdfError);
        }
      }

      // Send confirmation email to garage with invoice
      if (garage?.email) {
        await sendEmail("garage_demarche_confirmation", garage.email, {
          type: demarche.type,
          reference: demarche.numero_demarche,
          immatriculation: realImmat,
          garage_name: garage.raison_sociale,
          montant_ttc: actualAmount.toFixed(2),
          is_free_token: false,
          demarche_id: demarcheId,
          is_resubmission: true,
        }, pdfAttachment);
        console.log("✅ Resubmission confirmation email with invoice sent to garage");
      }
    }
  }

  if (orderId) {
    await supabase
      .from("guest_orders")
      .update({
        resubmission_paid: true,
        requires_resubmission_payment: false,
        updated_at: new Date().toISOString()
      })
      .eq("id", orderId);

    console.log("✅ Guest order resubmission payment processed");

    // Fetch guest order for facture & email
    const { data: order } = await supabase
      .from("guest_orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (order) {
      // Create facture
      const { data: factureNumero } = await supabase.rpc("generate_facture_numero");
      const { data: facture, error: factureError } = await supabase
        .from("factures")
        .insert({
          numero: factureNumero,
          guest_order_id: orderId,
          montant_ht: actualAmount,
          montant_ttc: actualAmount,
          tva: 0,
        })
        .select()
        .single();

      let pdfAttachment: Array<{ filename: string; content: string }> | undefined;

      if (factureError) {
        console.error("❌ Failed to create guest resubmission facture:", factureError);
      } else {
        console.log("✅ Guest resubmission facture created:", facture?.numero);

        try {
          const pdfBytes = await generateGuestFacturePDF(facture, order as GuestOrder);
          const pdfFileName = `facture_${facture.numero}.pdf`;
          pdfAttachment = [{ filename: pdfFileName, content: pdfToBase64(pdfBytes) }];

          const { error: uploadError } = await supabase.storage
            .from("factures")
            .upload(pdfFileName, pdfBytes, { contentType: "application/pdf", upsert: true });

          if (uploadError) {
            console.error("❌ Guest resubmission PDF upload failed:", uploadError);
          } else {
            const { data: { publicUrl } } = supabase.storage.from("factures").getPublicUrl(pdfFileName);
            await supabase.from("factures").update({ pdf_url: publicUrl }).eq("id", facture.id);
          }
        } catch (pdfError) {
          console.error("❌ Guest resubmission PDF generation failed:", pdfError);
        }
      }

      // Send confirmation email to guest
      if (order.email) {
        await sendEmail("payment_confirmed", order.email, {
          prenom: order.prenom,
          nom: order.nom,
          tracking_number: order.tracking_number,
          immatriculation: order.immatriculation,
          montant_ttc: actualAmount.toFixed(2),
        }, pdfAttachment);
        console.log("✅ Guest resubmission confirmation email sent");
      }
    }
  }
}

// -----------------------------
// WEBHOOK SERVER
// -----------------------------

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  if (!signature) {
    console.error("❌ Missing stripe-signature header");
    return new Response("Missing stripe-signature header", {
      status: 400,
      headers: corsHeaders,
    });
  }

  let event: Stripe.Event;

  // Try verifying with Stripe 1 webhook secret first, then Stripe 2
  let verifiedWith = "stripe1";
  try {
    event = await stripe1.webhooks.constructEventAsync(body, signature, webhookSecret1);
  } catch (err1) {
    // Try Stripe 2 webhook secret
    if (webhookSecret2) {
      try {
        event = await stripe2.webhooks.constructEventAsync(body, signature, webhookSecret2);
        verifiedWith = "stripe2";
      } catch (err2) {
        const errorMessage = err2 instanceof Error ? err2.message : "Unknown error";
        console.error("❌ Invalid Stripe Signature (tried both accounts):", errorMessage);
        return new Response(`Webhook error: ${errorMessage}`, {
          status: 400,
          headers: corsHeaders,
        });
      }
    } else {
      const errorMessage = err1 instanceof Error ? err1.message : "Unknown error";
      console.error("❌ Invalid Stripe Signature:", errorMessage);
      return new Response(`Webhook error: ${errorMessage}`, {
        status: 400,
        headers: corsHeaders,
      });
    }
  }

  console.log("✔️ Stripe event received:", event.type, "(verified with:", verifiedWith, ")");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("💰 Payment succeeded:", paymentIntent.id);

        // Check if it's a resubmission payment
        if (paymentIntent.metadata?.is_resubmission === "true") {
          await handleResubmissionPayment(supabase, paymentIntent);
        }
        // Check if it's a client payment
        else if (paymentIntent.metadata?.type === "client_payment") {
          await handleClientPayment(supabase, paymentIntent);
        }
        // Check if it's a token purchase
        else if (paymentIntent.metadata?.type === "token_purchase") {
          await handleTokenPurchase(supabase, paymentIntent);
        }
        // Check if it's a demarche payment
        else if (paymentIntent.metadata?.demarche_id) {
          await handleDemarchePayment(supabase, paymentIntent);
        }
        // Check if it's a guest order payment
        else if (paymentIntent.metadata?.guest_order_id) {
          await handleGuestOrderPayment(supabase, paymentIntent);
        } else {
          console.log("⚠️ Payment intent has no recognized metadata");
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("❌ Payment failed:", paymentIntent.id);
        console.log("Failure reason:", paymentIntent.last_payment_error?.message);
        break;
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Error processing webhook:", errorMessage);

    // Notify admin par email
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
      await fetch(`${supabaseUrl}/functions/v1/notify-error`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey },
        body: JSON.stringify({
          source: 'webhook-stripe',
          error: errorMessage,
          context: { eventType: event?.type || 'unknown', eventId: event?.id || 'N/A' },
        }),
      });
    } catch (_) { /* silent */ }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
