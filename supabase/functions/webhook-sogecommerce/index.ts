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
        body: JSON.stringify({ type, to, data, attachments }),
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

  // Mode split : pas de facture ni email tant que le client n'a pas payé.
  if (paymentMode === "split") {
    console.log("📋 Split mode: skipping facture & emails — waiting for client payment");
    return "split_pro_paid";
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

    // --- 5. Récupération de nos étiquettes ------------------------------
    const demarcheId = fields["vads_ext_info_demarche_id"];
    const paymentMode = fields["vads_ext_info_payment_mode"] || "pro_pays_all";
    const transUuid = fields["vads_trans_uuid"] || fields["vads_trans_id"] || "";
    const amount = Number(fields["vads_amount"] || "0") / 100;

    if (!demarcheId) {
      console.error("❌ vads_ext_info_demarche_id manquant dans l'IPN");
      return new Response("missing demarche id", { status: 400, headers: corsHeaders });
    }

    if (paymentMode === "client_pays_all") {
      console.log("ℹ️ Mode client_pays_all non géré par cette fonction (côté pro uniquement).");
      return new Response("ignored (client mode)", { status: 200, headers: corsHeaders });
    }

    // --- 6. Traitement métier (base de données) -------------------------
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const outcome = await handleDemarchePayment(
      supabase,
      demarcheId,
      paymentMode,
      amount,
      transUuid,
    );

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
