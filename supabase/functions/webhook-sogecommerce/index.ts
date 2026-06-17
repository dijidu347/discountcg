// ============================================================================
// webhook-sogecommerce
// ----------------------------------------------------------------------------
// Réception de la notification de paiement (IPN) de Sogecommerce (Société
// Générale, techno Lyra/PayZen) — l'équivalent de webhook-stripe, mais pour
// les paiements passés via create-sogecommerce-payment.
//
// PÉRIMÈTRE (PREMIÈRE ÉTAPE, côté pro) :
//  - Gère UNIQUEMENT le paiement d'une DÉMARCHE par un garage.
//  - Mode pro_pays_all : marque la démarche payée + facture + emails
//    (garage & admin), exactement comme webhook-stripe.
//  - Mode split : marque "en attente paiement client" SANS facture ni email
//    (même comportement que Stripe ; la part client reste sur Stripe pour
//    l'instant).
//  - Le parcours client (client_pays_all / part client du split) viendra plus
//    tard.
//
// ISOLATION :
//  - Fonction 100 % autonome. Ne touche NI à webhook-stripe NI au dossier src/.
//  - Les helpers (sendEmail, generateDemarcheFacturePDF, ADMIN_EMAILS) et la
//    fonction de signature (computeSignature) sont RECOPIÉS à l'identique
//    depuis webhook-stripe et create-sogecommerce-payment (rien d'inventé).
//
// IDEMPOTENCE (Option A, sans migration) :
//  - On refuse de re-traiter : si la démarche est déjà payée (pro_pays_all) ou
//    si un paiement existe déjà avec le même identifiant de transaction
//    Sogecommerce (vads_trans_uuid), on répond 200 sans rien refaire. Évite les
//    doubles factures quand Société Générale rejoue l'IPN.
//
// SÉCURITÉ :
//  - La signature de l'IPN est vérifiée avec la clé de la boutique
//    (SOGE_SIGNATURE_KEY, sinon SOGE_KEY_TEST), même algorithme qu'à l'aller.
//  - verify_jwt = false (l'IPN est un appel serveur-à-serveur sans jeton).
//
// Secrets Supabase utilisés :
//  - SOGE_SIGNATURE_KEY / SOGE_KEY_TEST : clé de signature de la boutique
//  - SOGE_SIGN_ALGO                     : "HMAC-SHA-256" (défaut) ou "SHA-1"
//  - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY : accès base + appel send-email
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

// -----------------------------
// Types (recopiés de webhook-stripe)
// -----------------------------
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

interface Garage {
  id: string;
  raison_sociale: string;
  email: string;
  adresse: string;
  code_postal: string;
  ville: string;
  siret: string;
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
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Admin emails for notifications (recopié de webhook-stripe)
const ADMIN_EMAILS = [
  "contact@discountcartegrise.fr",
];

// ---------------------------------------------------------------------------
// SIGNATURE (recopié à l'identique de create-sogecommerce-payment)
// ---------------------------------------------------------------------------
function hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function base64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

// Règle officielle du formulaire V2 (Lyra/PayZen) :
//  1. tous les champs dont le nom commence par "vads_"
//  2. triés par ordre alphabétique de leur NOM
//  3. valeurs collées par "+", puis "+" + clé  => "v1+v2+...+vN+CLE"
//  4. HMAC-SHA-256 : base64( hmac_sha256(chaine, CLE) ) ; SHA-1 : sha1_hex
async function computeSignature(
  fields: Record<string, string>,
  key: string,
  algo: string,
): Promise<string> {
  const names = Object.keys(fields)
    .filter((n) => n.startsWith("vads_"))
    .sort();

  const content = names.map((n) => fields[n]).join("+") + "+" + key;
  const enc = new TextEncoder();

  if (algo === "SHA-1") {
    const digest = await crypto.subtle.digest("SHA-1", enc.encode(content));
    return hex(digest);
  }

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(content));
  return base64(sig);
}

// Comparaison à temps ~constant pour éviter les attaques par timing.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// -----------------------------
// HELPERS EMAIL / PDF (recopiés de webhook-stripe)
// -----------------------------

// Petite pause pour rester sous la limite Resend (2 req/s).
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  attachments?: Array<{ filename: string; content: string }>,
  cc?: string,
): Promise<void> {
  try {
    console.log(`📧 Sending email type: ${type} to: ${to}`);

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
        body: JSON.stringify({ type, to, data, attachments, cc }),
      },
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

// PDF facture démarche — recopié à l'identique de webhook-stripe.
async function generateDemarcheFacturePDF(
  facture: Facture,
  demarche: Demarche,
  garage: Garage,
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

// PDF facture commande particulier (guest) — recopié de webhook-stripe.
async function generateGuestFacturePDF(
  facture: Facture,
  order: GuestOrder,
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
  page.drawText("DÉSIGNATION", { x: margin + 10, y: y + 8, size: 10, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText("MONTANT", { x: width - margin - 80, y: y + 8, size: 10, font: fontBold, color: rgb(1, 1, 1) });

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

// ---------------------------------------------------------------------------
// Outils IPN
// ---------------------------------------------------------------------------

// Lit le corps de l'IPN (form-urlencoded en prod, JSON accepté pour les tests
// manuels) et renvoie une map plate de tous les champs.
async function parseIpnFields(req: Request): Promise<Record<string, string>> {
  const contentType = req.headers.get("content-type") || "";
  const fields: Record<string, string> = {};

  if (contentType.includes("application/json")) {
    const json = await req.json();
    for (const [k, v] of Object.entries(json)) fields[k] = String(v);
    return fields;
  }

  // Cas standard Sogecommerce : application/x-www-form-urlencoded
  const raw = await req.text();
  const params = new URLSearchParams(raw);
  for (const [k, v] of params.entries()) fields[k] = v;
  return fields;
}

// Le paiement est-il accepté ? On accepte AUTHORISED / CAPTURED, ou result=00.
function isPaymentSuccessful(fields: Record<string, string>): boolean {
  const status = (fields["vads_trans_status"] || "").toUpperCase();
  const result = fields["vads_result"] || "";
  if (result === "00") return true;
  return status === "AUTHORISED" || status === "CAPTURED";
}

// ---------------------------------------------------------------------------
// Traitement métier d'une démarche payée (recopié de webhook-stripe,
// adapté aux champs Sogecommerce). Renvoie un texte de log.
// ---------------------------------------------------------------------------
async function handleDemarchePayment(
  supabase: SupabaseClient,
  demarcheId: string,
  paymentMode: string,
  amount: number,
  transUuid: string,
): Promise<string> {
  console.log(`📋 Processing demarche payment: ${demarcheId} (mode ${paymentMode})`);

  // Récupère la démarche + garage + véhicule
  const { data: demarche, error: demarcheError } = await supabase
    .from("demarches")
    .select("*, garages(*), vehicules(immatriculation)")
    .eq("id", demarcheId)
    .single();

  if (demarcheError || !demarche) {
    console.error("❌ Demarche not found:", demarcheError);
    return "demarche_not_found";
  }

  // --- IDEMPOTENCE (Option A, sans migration) ---------------------------
  // 1) pro_pays_all déjà payée → on ne refait rien (évite double facture).
  if (paymentMode !== "split" && demarche.paye === true) {
    console.log("↩️ Démarche déjà payée — IPN ignorée (idempotence)");
    return "already_paid";
  }
  // 2) Un paiement avec ce même identifiant Sogecommerce existe déjà
  //    (couvre aussi le mode split) → on ne refait rien.
  if (transUuid) {
    const { data: existing } = await supabase
      .from("paiements")
      .select("id")
      .eq("stripe_payment_id", transUuid)
      .maybeSingle();
    if (existing) {
      console.log("↩️ Paiement déjà enregistré — IPN ignorée (idempotence)");
      return "already_processed";
    }
  }

  const garage = demarche.garages as Garage;
  // Résout l'immatriculation TEMP
  const realImmat = (demarche.immatriculation === "TEMP" && (demarche as any).vehicules?.immatriculation)
    ? (demarche as any).vehicules.immatriculation
    : demarche.immatriculation;

  // Mise à jour de la démarche selon le mode (même logique que Stripe)
  let updateFields: Record<string, unknown>;
  if (paymentMode === "split") {
    updateFields = {
      paye: false,
      status: "en_attente_paiement_client",
      is_draft: false,
      updated_at: new Date().toISOString(),
    };
    console.log("📋 Split mode: pro paid their part, waiting for client");
  } else {
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
    return "update_failed";
  }
  console.log("✅ Demarche updated (mode:", paymentMode, ")");

  // Crée l'enregistrement paiement (identifiant Sogecommerce dans
  // stripe_payment_id, faute de colonne dédiée).
  const { error: paiementError } = await supabase
    .from("paiements")
    .insert({
      demarche_id: demarcheId,
      garage_id: demarche.garage_id,
      montant: amount,
      status: "valide",
      stripe_payment_id: transUuid,
      validated_at: new Date().toISOString(),
      payer_type: "pro",
    });

  if (paiementError) {
    console.error("❌ Failed to create paiement:", paiementError);
  }

  // Mode split : pas de facture ni email garage tant que le client n'a pas payé.
  // En revanche, on génère le LIEN CLIENT (token + email), comme le faisait le
  // front après le paiement Stripe (create-client-payment-link).
  if (paymentMode === "split") {
    // Idempotence : si un lien client existe déjà, on ne le régénère pas.
    if (demarche.client_payment_token) {
      console.log("↩️ Lien client déjà existant — pas de régénération");
      return "split_pro_paid_link_exists";
    }

    // Génère le token (même logique que create-client-payment-link)
    const clientPaymentToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await supabase
      .from("demarches")
      .update({
        client_payment_token: clientPaymentToken,
        client_payment_token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", demarcheId);

    // Notification in-app pour le garage (cloche temps réel)
    const { error: notifError } = await supabase
      .from("notifications")
      .insert({
        garage_id: demarche.garage_id,
        demarche_id: demarcheId,
        type: "client_payment_link_sent",
        message: `Lien de paiement envoyé au client pour la démarche ${demarche.numero_demarche} (${realImmat})`,
      });
    if (notifError) {
      console.error("❌ Failed to insert client_payment_link_sent notification:", notifError);
    }

    // Email au client (cc garage), type client_payment_link
    if (demarche.client_email) {
      await sendEmail(
        "client_payment_link",
        demarche.client_email,
        {
          payment_url: `https://discountcartegrise.fr/paiement-client/${clientPaymentToken}`,
          garage_name: garage?.raison_sociale,
          immatriculation: realImmat,
          type: demarche.type,
          client_nom: demarche.client_nom || "",
          client_prenom: demarche.client_prenom || "",
          expires_at: expiresAt.toISOString(),
        },
        undefined, // pas de pièce jointe
        garage?.email, // cc garage
      );
      console.log("✅ Split mode: lien client généré et email envoyé au client");
    } else {
      console.log("⚠️ Split mode: token généré mais pas d'email client (client_email absent)");
    }

    return "split_pro_paid_link_created";
  }

  // --- Génération de facture (pro_pays_all) -----------------------------
  const { data: factureNumero } = await supabase.rpc("generate_facture_numero");

  const { data: facture, error: factureError } = await supabase
    .from("factures")
    .insert({
      numero: factureNumero,
      demarche_id: demarcheId,
      garage_id: demarche.garage_id,
      montant_ht: amount,
      montant_ttc: amount,
      tva: 0,
    })
    .select()
    .single();

  let demarchePdfAttachment: Array<{ filename: string; content: string }> | undefined;

  if (factureError) {
    console.error("❌ Failed to create facture:", factureError);
  } else {
    console.log("✅ Facture created:", facture?.numero);

    try {
      const pdfBytes = await generateDemarcheFacturePDF(facture, demarche, garage);
      const pdfFileName = `facture_${facture.numero}.pdf`;

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

  // Lie la facture à la démarche
  if (facture) {
    await supabase
      .from("demarches")
      .update({ facture_id: facture.id })
      .eq("id", demarcheId);
  }

  // Email de confirmation au garage AVEC la facture en pièce jointe
  if (garage?.email) {
    await sendEmail("garage_demarche_confirmation", garage.email, {
      type: demarche.type,
      reference: demarche.numero_demarche,
      immatriculation: realImmat,
      garage_name: garage.raison_sociale,
      montant_ttc: amount.toFixed(2),
      is_free_token: demarche.is_free_token || false,
      demarche_id: demarcheId,
    }, demarchePdfAttachment);
    console.log("✅ Confirmation email with invoice sent to garage");
  }

  // Notifications admin (avec pause anti rate-limit)
  for (let i = 0; i < ADMIN_EMAILS.length; i++) {
    await delay(600);
    await sendEmail("admin_new_demarche", ADMIN_EMAILS[i], {
      type: demarche.type,
      reference: demarche.numero_demarche,
      immatriculation: realImmat,
      client_name: garage?.raison_sociale || "N/A",
      montant_ttc: amount.toFixed(2),
      is_free_token: demarche.is_free_token || false,
    });
  }
  console.log("✅ Admin notification emails sent");

  return "pro_paid_full";
}

// ---------------------------------------------------------------------------
// Traitement métier d'une COMMANDE PARTICULIER (guest) payée.
// Recopié de handleGuestOrderPayment (webhook-stripe), adapté aux champs
// Sogecommerce : montant = vads_amount, identifiant = vads_trans_uuid,
// email de secours = vads_cust_email.
// ---------------------------------------------------------------------------
async function handleGuestOrderPayment(
  supabase: SupabaseClient,
  orderId: string,
  amount: number,
  transUuid: string,
  custEmail: string,
): Promise<string> {
  console.log(`📋 Processing guest order payment: ${orderId}`);

  const { data: order, error: orderError } = await supabase
    .from("guest_orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    console.error("❌ Guest order not found:", orderError);
    return "order_not_found";
  }

  // --- IDEMPOTENCE (Option A, sans migration) ---------------------------
  if (order.paye === true) {
    console.log("↩️ Commande déjà payée — IPN ignorée (idempotence)");
    return "already_paid";
  }

  // Montant payé (autoritatif = celui de Sogecommerce) vs valeurs en base.
  const actualTTC = (order.montant_ttc && order.montant_ttc > 0) ? order.montant_ttc : amount;
  const actualHT = (order.montant_ht && order.montant_ht > 0)
    ? order.montant_ht
    : Math.max(0, amount - (order.frais_dossier || 30));

  const { error: updateError } = await supabase
    .from("guest_orders")
    .update({
      paye: true,
      status: "paye",
      paid_at: new Date().toISOString(),
      payment_intent_id: transUuid,
      montant_ht: actualHT,
      montant_ttc: actualTTC,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (updateError) {
    console.error("❌ Failed to update guest order:", updateError);
    return "update_failed";
  }
  console.log("✅ Guest order marked as paid, montant_ttc:", actualTTC);

  // Relit la commande (les infos ont pu être saisies avant le paiement)
  const { data: freshOrder } = await supabase
    .from("guest_orders")
    .select("*")
    .eq("id", orderId)
    .single();
  const orderData = freshOrder || order;

  // Email : base d'abord, puis email du ticket Sogecommerce en secours.
  const clientEmail = orderData.email || custEmail || "";
  if (!orderData.email && clientEmail) {
    console.log("📧 Email absent en base, utilisation de l'email Sogecommerce:", clientEmail);
    await supabase.from("guest_orders")
      .update({ email: clientEmail, updated_at: new Date().toISOString() })
      .eq("id", orderId);
  }

  // --- Création / liaison du compte particulier (parité Stripe) ---------
  try {
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

    if (!userId && clientEmail) {
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

    if (userId) {
      await supabase
        .from("guest_orders")
        .update({ user_id: userId })
        .eq("id", orderId);

      await supabase
        .from("particulier_profiles")
        .upsert({
          user_id: userId,
          email: clientEmail,
          nom: orderData.nom || "",
          prenom: orderData.prenom || "",
          telephone: orderData.telephone || "",
        }, { onConflict: "user_id" });

      await supabase
        .from("user_roles")
        .upsert({ user_id: userId, role: "particulier" as any }, { onConflict: "user_id,role" });

      console.log("✅ User linked to guest order");
    }
  } catch (authError) {
    console.error("⚠️ Failed to create/link user account:", authError);
  }

  // --- Facture ----------------------------------------------------------
  const { data: factureNumero, error: rpcError } = await supabase.rpc("generate_facture_numero");
  if (rpcError) {
    console.error("❌ Failed to generate facture numero:", rpcError);
  }

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
      } else {
        console.error("❌ PDF upload failed:", uploadError);
      }
    } catch (pdfError) {
      console.error("❌ Guest PDF generation failed:", pdfError);
    }
  }

  // --- Email de confirmation au client (facture en PJ) ------------------
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

  // --- Notifications admin ----------------------------------------------
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

  return "guest_paid";
}

// ---------------------------------------------------------------------------
// Traitement métier d'un PAIEMENT CLIENT-VIA-LIEN (part client d'une démarche).
// Recopié de handleClientPayment (webhook-stripe), adapté aux champs
// Sogecommerce : montant = vads_amount, identifiant = vads_trans_uuid.
// ---------------------------------------------------------------------------
async function handleClientPayment(
  supabase: SupabaseClient,
  demarcheId: string,
  paymentMode: string,
  amount: number,
  transUuid: string,
): Promise<string> {
  console.log(`📋 Processing client payment for demarche: ${demarcheId}, mode: ${paymentMode}`);

  const { data: demarche, error: demarcheError } = await supabase
    .from("demarches")
    .select("*, garages(*), vehicules(immatriculation)")
    .eq("id", demarcheId)
    .single();

  if (demarcheError || !demarche) {
    console.error("❌ Demarche not found:", demarcheError);
    return "demarche_not_found";
  }

  // --- IDEMPOTENCE (Option A, sans migration) ---------------------------
  // 1) Part client déjà payée → on ne refait rien (évite double facture).
  if (demarche.client_paid === true) {
    console.log("↩️ Part client déjà payée — IPN ignorée (idempotence)");
    return "already_paid";
  }
  // 2) Un paiement avec ce même identifiant Sogecommerce existe déjà.
  if (transUuid) {
    const { data: existing } = await supabase
      .from("paiements")
      .select("id")
      .eq("stripe_payment_id", transUuid)
      .maybeSingle();
    if (existing) {
      console.log("↩️ Paiement déjà enregistré — IPN ignorée (idempotence)");
      return "already_processed";
    }
  }

  const garage = demarche.garages as Garage;
  const realImmat = (demarche.immatriculation === "TEMP" && (demarche as any).vehicules?.immatriculation)
    ? (demarche as any).vehicules.immatriculation
    : demarche.immatriculation;

  // Mise à jour de la démarche : le client a payé sa part.
  const updateFields: Record<string, unknown> = {
    client_paid: true,
    client_paid_at: new Date().toISOString(),
    client_stripe_payment_id: transUuid,
    updated_at: new Date().toISOString(),
  };
  // Dans les deux modes, le paiement client finalise le règlement.
  if (paymentMode === "split" || paymentMode === "client_pays_all") {
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
    return "update_failed";
  }
  console.log("✅ Demarche updated with client payment");

  // Crée l'enregistrement paiement (payer_type = client).
  const { error: paiementError } = await supabase
    .from("paiements")
    .insert({
      demarche_id: demarcheId,
      garage_id: demarche.garage_id,
      montant: amount,
      status: "valide",
      stripe_payment_id: transUuid,
      validated_at: new Date().toISOString(),
      payer_type: "client",
    });

  if (paiementError) {
    console.error("❌ Failed to create paiement:", paiementError);
  }

  // --- Facture + confirmations (les deux modes finalisent) --------------
  const { data: factureNumero } = await supabase.rpc("generate_facture_numero");

  const { data: facture, error: factureError } = await supabase
    .from("factures")
    .insert({
      numero: factureNumero,
      demarche_id: demarcheId,
      garage_id: demarche.garage_id,
      montant_ht: amount,
      montant_ttc: amount,
      tva: 0,
    })
    .select()
    .single();

  let clientPdfAttachment: Array<{ filename: string; content: string }> | undefined;

  if (factureError) {
    console.error("❌ Failed to create facture:", factureError);
  } else {
    console.log("✅ Facture created:", facture?.numero);

    try {
      const pdfBytes = await generateDemarcheFacturePDF(facture, demarche, garage);
      const pdfFileName = `facture_${facture.numero}.pdf`;

      clientPdfAttachment = [{ filename: pdfFileName, content: pdfToBase64(pdfBytes) }];

      const { error: uploadError } = await supabase.storage
        .from("factures")
        .upload(pdfFileName, pdfBytes, { contentType: "application/pdf", upsert: true });

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from("factures").getPublicUrl(pdfFileName);
        await supabase.from("factures").update({ pdf_url: publicUrl }).eq("id", facture.id);
        console.log("✅ PDF uploaded:", pdfFileName);
      } else {
        console.error("❌ PDF upload failed:", uploadError);
      }
    } catch (pdfError) {
      console.error("❌ PDF generation failed:", pdfError);
    }
  }

  // Lie la facture à la démarche
  if (facture) {
    await supabase
      .from("demarches")
      .update({ facture_id: facture.id })
      .eq("id", demarcheId);
  }

  // Email de confirmation au client (facture en PJ)
  if (demarche.client_email) {
    await sendEmail("client_payment_confirmed", demarche.client_email, {
      immatriculation: realImmat,
      montant_ttc: amount.toFixed(2),
      reference: demarche.numero_demarche,
    }, clientPdfAttachment);
    console.log("✅ Client payment confirmation email with invoice sent to", demarche.client_email);
  }

  // Notification au garage (facture en PJ)
  await delay(600);
  if (garage?.email) {
    await sendEmail("garage_client_paid", garage.email, {
      garage_name: garage.raison_sociale,
      client_email: demarche.client_email || "N/A",
      immatriculation: realImmat,
      montant_ttc: amount.toFixed(2),
      reference: demarche.numero_demarche,
      demarche_id: demarcheId,
    }, clientPdfAttachment);
    console.log("✅ Garage notified with invoice: client paid");
  }

  // Notification in-app pour le garage (cloche temps réel)
  const { error: notifError } = await supabase
    .from("notifications")
    .insert({
      garage_id: demarche.garage_id,
      demarche_id: demarcheId,
      type: "client_payment_confirmed",
      message: `Le client a payé ${amount.toFixed(2)} € pour la démarche ${demarche.numero_demarche} (${realImmat})`,
    });

  if (notifError) {
    console.error("❌ Failed to insert client_payment_confirmed notification:", notifError);
  } else {
    console.log("✅ Notification client_payment_confirmed inserted for garage");
  }

  // Notifications admin
  await delay(600);
  for (let i = 0; i < ADMIN_EMAILS.length; i++) {
    await delay(600);
    await sendEmail("admin_new_demarche", ADMIN_EMAILS[i], {
      type: demarche.type,
      reference: demarche.numero_demarche,
      immatriculation: realImmat,
      client_name: garage?.raison_sociale || "N/A",
      montant_ttc: amount.toFixed(2),
      is_free_token: demarche.is_free_token || false,
    });
  }
  console.log("✅ Admin notification emails sent");

  return "client_paid";
}

// ---------------------------------------------------------------------------
// Point d'entrée
// ---------------------------------------------------------------------------
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- 1. Clé de signature + algorithme -------------------------------
    const signatureKey = Deno.env.get("SOGE_SIGNATURE_KEY") || Deno.env.get("SOGE_KEY_TEST");
    const signAlgo = (Deno.env.get("SOGE_SIGN_ALGO") || "HMAC-SHA-256").toUpperCase();
    if (!signatureKey) {
      console.error("❌ Clé de signature manquante (SOGE_SIGNATURE_KEY / SOGE_KEY_TEST)");
      return new Response("config error", { status: 500, headers: corsHeaders });
    }

    // --- 2. Lecture des champs de l'IPN ---------------------------------
    const fields = await parseIpnFields(req);
    const receivedSignature = fields["signature"] || "";

    // --- 3. Vérification de la signature --------------------------------
    const expectedSignature = await computeSignature(fields, signatureKey, signAlgo);
    if (!receivedSignature || !safeEqual(receivedSignature, expectedSignature)) {
      console.error("❌ Signature IPN invalide");
      return new Response("invalid signature", { status: 400, headers: corsHeaders });
    }

    console.log(
      "✅ Signature IPN valide — order:",
      fields["vads_order_id"],
      "status:",
      fields["vads_trans_status"],
    );

    // --- 4. Paiement accepté ? ------------------------------------------
    if (!isPaymentSuccessful(fields)) {
      console.log(
        "ℹ️ Paiement non accepté (status:",
        fields["vads_trans_status"],
        ", result:",
        fields["vads_result"],
        ") — rien à faire.",
      );
      // On répond 200 pour que Société Générale ne rejoue pas l'IPN.
      return new Response("ignored (not successful)", { status: 200, headers: corsHeaders });
    }

    // --- 5. Routage par type de payeur (comme webhook-stripe) -----------
    // vads_ext_info_type : "guest_order" (particulier) ; absent → démarche pro.
    const flowType = fields["vads_ext_info_type"] || "demarche";
    const transUuid = fields["vads_trans_uuid"] || fields["vads_trans_id"] || "";
    const amount = Number(fields["vads_amount"] || "0") / 100;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    let outcome: string;

    if (flowType === "guest_order") {
      // --- Parcours PARTICULIER (guest) ---------------------------------
      const orderId = fields["vads_ext_info_order_id"];
      if (!orderId) {
        console.error("❌ vads_ext_info_order_id manquant dans l'IPN");
        return new Response("missing order id", { status: 400, headers: corsHeaders });
      }
      outcome = await handleGuestOrderPayment(
        supabase,
        orderId,
        amount,
        transUuid,
        fields["vads_cust_email"] || "",
      );
    } else if (flowType === "client_payment") {
      // --- Parcours CLIENT-VIA-LIEN (part client d'une démarche) --------
      const demarcheId = fields["vads_ext_info_demarche_id"];
      const paymentMode = fields["vads_ext_info_payment_mode"] || "client_pays_all";
      if (!demarcheId) {
        console.error("❌ vads_ext_info_demarche_id manquant dans l'IPN (client_payment)");
        return new Response("missing demarche id", { status: 400, headers: corsHeaders });
      }
      outcome = await handleClientPayment(
        supabase,
        demarcheId,
        paymentMode,
        amount,
        transUuid,
      );
    } else {
      // --- Parcours DÉMARCHE PRO (comportement existant) ----------------
      const demarcheId = fields["vads_ext_info_demarche_id"];
      const paymentMode = fields["vads_ext_info_payment_mode"] || "pro_pays_all";

      if (!demarcheId) {
        console.error("❌ vads_ext_info_demarche_id manquant dans l'IPN");
        return new Response("missing demarche id", { status: 400, headers: corsHeaders });
      }
      if (paymentMode === "client_pays_all") {
        console.log("ℹ️ Mode client_pays_all non géré par cette fonction (côté pro uniquement).");
        return new Response("ignored (client mode)", { status: 200, headers: corsHeaders });
      }
      outcome = await handleDemarchePayment(
        supabase,
        demarcheId,
        paymentMode,
        amount,
        transUuid,
      );
    }

    // Toujours 200 quand on a reconnu et traité (ou volontairement ignoré)
    // l'IPN, pour éviter les rejeux de Société Générale.
    return new Response(`ok: ${outcome}`, { status: 200, headers: corsHeaders });
  } catch (error: any) {
    console.error("❌ Erreur webhook-sogecommerce:", error);
    // 500 → Société Générale réessaiera (l'idempotence protège des doublons).
    return new Response(`error: ${error?.message || "unknown"}`, {
      status: 500,
      headers: corsHeaders,
    });
  }
});
