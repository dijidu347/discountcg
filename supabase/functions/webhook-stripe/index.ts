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

// Stripe client - Production
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Admin emails for notifications
const ADMIN_EMAILS = [
  "contact@discountcartegrise.fr",
  "mathieugaillac4@gmail.com"
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

async function sendEmail(
  type: string, 
  to: string, 
  data: Record<string, unknown>
): Promise<void> {
  try {
    console.log(`📧 Sending email type: ${type} to: ${to}`);
    console.log("📧 Email data:", JSON.stringify(data));
    
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
        body: JSON.stringify({ type, to, data }),
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
  page.drawText("DiscountCarteGrise", { x: margin, y, size: 24, font: fontBold, color: blue });

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
  page.drawText("DiscountCarteGrise - Service de cartes grises en ligne", { x: margin, y, size: 9, font: fontRegular, color: gray });

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

  // Fetch demarche with garage
  const { data: demarche, error: demarcheError } = await supabase
    .from("demarches")
    .select("*, garages(*)")
    .eq("id", demarcheId)
    .single();

  if (demarcheError || !demarche) {
    console.error("❌ Demarche not found:", demarcheError);
    return;
  }

  const garage = demarche.garages as Garage;

  // Update demarche as paid
  const { error: updateError } = await supabase
    .from("demarches")
    .update({ 
      paye: true, 
      status: "paye",
      updated_at: new Date().toISOString()
    })
    .eq("id", demarcheId);

  if (updateError) {
    console.error("❌ Failed to update demarche:", updateError);
    return;
  }

  console.log("✅ Demarche marked as paid");

  // Create paiement record
  const { error: paiementError } = await supabase
    .from("paiements")
    .insert({
      demarche_id: demarcheId,
      garage_id: demarche.garage_id,
      montant: demarche.montant_ttc,
      status: "valide",
      stripe_payment_id: paymentIntent.id,
      validated_at: new Date().toISOString(),
    });

  if (paiementError) {
    console.error("❌ Failed to create paiement:", paiementError);
  }

  // Generate facture number
  const { data: factureNumero } = await supabase.rpc("generate_facture_numero");

  // Create facture (sans TVA)
  const { data: facture, error: factureError } = await supabase
    .from("factures")
    .insert({
      numero: factureNumero,
      demarche_id: demarcheId,
      garage_id: demarche.garage_id,
      montant_ht: demarche.montant_ht || 0,
      montant_ttc: demarche.montant_ttc || 0,
      tva: 0,
    })
    .select()
    .single();

  if (factureError) {
    console.error("❌ Failed to create facture:", factureError);
  } else {
    console.log("✅ Facture created:", facture?.numero);

    // Generate and upload PDF
    try {
      const pdfBytes = await generateDemarcheFacturePDF(facture, demarche, garage);
      const pdfFileName = `facture_${facture.numero}.pdf`;

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

  // Send client confirmation email FIRST (always send to garage)
  if (garage?.email) {
    await sendEmail("garage_demarche_confirmation", garage.email, {
      type: demarche.type,
      reference: demarche.numero_demarche,
      immatriculation: demarche.immatriculation,
      garage_name: garage.raison_sociale,
      montant_ttc: demarche.montant_ttc?.toFixed(2) || "0.00",
      is_free_token: demarche.is_free_token || false,
    });
    console.log("✅ Client confirmation email sent");
  }

  // Send admin notification emails with delays to avoid rate limiting
  for (let i = 0; i < ADMIN_EMAILS.length; i++) {
    // Wait 600ms between each email to stay under 2 req/sec limit
    await delay(600);
    
    await sendEmail("admin_new_demarche", ADMIN_EMAILS[i], {
      type: demarche.type,
      reference: demarche.numero_demarche,
      immatriculation: demarche.immatriculation,
      client_name: garage?.raison_sociale || "N/A",
      montant_ttc: demarche.montant_ttc?.toFixed(2) || "0.00",
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

  // Update order as paid
  const { error: updateError } = await supabase
    .from("guest_orders")
    .update({ 
      paye: true, 
      status: "paye",
      paid_at: new Date().toISOString(),
      payment_intent_id: paymentIntent.id,
      updated_at: new Date().toISOString()
    })
    .eq("id", orderId);

  if (updateError) {
    console.error("❌ Failed to update guest order:", updateError);
    return;
  }

  console.log("✅ Guest order marked as paid");

  // Generate facture number
  const { data: factureNumero } = await supabase.rpc("generate_facture_numero");

  // Create facture (sans TVA)
  const { data: facture, error: factureError } = await supabase
    .from("factures")
    .insert({
      numero: factureNumero,
      guest_order_id: orderId,
      montant_ht: order.montant_ht || 0,
      montant_ttc: order.montant_ttc || 0,
      tva: 0,
    })
    .select()
    .single();

  if (factureError) {
    console.error("❌ Failed to create facture:", factureError);
  } else {
    console.log("✅ Facture created:", facture?.numero);
  }

  // Send client confirmation email FIRST
  if (order.email) {
    await sendEmail("payment_confirmed", order.email, {
      tracking_number: order.tracking_number,
      prenom: order.prenom,
      nom: order.nom,
      immatriculation: order.immatriculation,
      montant_ttc: order.montant_ttc?.toFixed(2) || "0.00",
    });
    console.log("✅ Client confirmation email sent");
  }

  // Send admin notification emails with delays to avoid rate limiting
  for (let i = 0; i < ADMIN_EMAILS.length; i++) {
    // Wait 600ms between each email to stay under 2 req/sec limit
    await delay(600);
    
    await sendEmail("admin_new_demarche", ADMIN_EMAILS[i], {
      type: order.demarche_type || "CG",
      reference: order.tracking_number,
      immatriculation: order.immatriculation,
      client_name: `${order.prenom} ${order.nom}`,
      montant_ttc: order.montant_ttc?.toFixed(2) || "0.00",
      is_free_token: false,
    });
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

  // Record purchase
  const { error: purchaseError } = await supabase
    .from("token_purchases")
    .insert({
      garage_id: garageId,
      quantity: creditAmount,
      amount: paymentIntent.amount / 100,
      stripe_payment_id: paymentIntent.id,
    });

  if (purchaseError) {
    console.error("❌ Failed to record purchase:", purchaseError);
  } else {
    console.log("✅ Balance recharge recorded");
  }

  // Send confirmation email to garage
  const pricePaid = paymentIntent.amount / 100;
  if (garage.email) {
    await sendEmail("recharge_confirmed", garage.email, {
      garage_name: garage.raison_sociale,
      amount: creditAmount,
      price: pricePaid,
      new_balance: newBalance,
    });
    console.log("✅ Balance recharge confirmation email sent");
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

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("❌ Invalid Stripe Signature:", errorMessage);
    return new Response(`Webhook error: ${errorMessage}`, {
      status: 400,
      headers: corsHeaders,
    });
  }

  console.log("✔️ Stripe event received:", event.type);

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
    // Don't return error to Stripe to prevent retries for processing errors
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
