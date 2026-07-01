// ============================================================================
// create-sogecommerce-guest-payment
// ----------------------------------------------------------------------------
// Paiement Sogecommerce (Société Générale) d'une COMMANDE PARTICULIER (guest),
// modèle REDIRECTION (page de paiement hébergée). Équivalent de la branche
// "guest_order" de create-payment-intent, mais pour Sogecommerce.
//
// PÉRIMÈTRE :
//  - Gère UNIQUEMENT le particulier en invité (table guest_orders).
//  - PUBLIQUE : aucune authentification (verify_jwt = false). On s'appuie sur
//    l'orderId de la commande, comme le fait Stripe pour les guest orders.
//  - Le montant est RECALCULÉ CÔTÉ SERVEUR à partir des colonnes de
//    guest_orders (on ne fait pas confiance au montant envoyé par le front).
//
// ISOLATION :
//  - Fonction autonome. Ne touche NI à create-payment-intent NI à src/.
//  - La fonction de signature (computeSignature) et les outils vads_* sont
//    recopiés à l'identique de create-sogecommerce-payment.
//  - Mode TEST (SOGE_MODE = TEST).
//
// Étiquettes posées pour le webhook (relues par webhook-sogecommerce) :
//  - vads_ext_info_type     = "guest_order"
//  - vads_ext_info_order_id = id de la guest_order
//  - vads_ext_info_tracking = tracking_number
//
// Secrets Supabase : SOGE_SITE_ID, SOGE_KEY_TEST, SOGE_SIGNATURE_KEY,
//  SOGE_MODE, SOGE_SIGN_ALGO, SOGE_PAYMENT_URL, SOGE_RETURN_URL,
//  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_PAYMENT_URL = "https://sogecommerce.societegenerale.eu/vads-payment/";

// ---------------------------------------------------------------------------
// Outils vads_* (recopiés de create-sogecommerce-payment)
// ---------------------------------------------------------------------------
function vadsTransDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}` +
    `${p(d.getUTCMonth() + 1)}` +
    `${p(d.getUTCDate())}` +
    `${p(d.getUTCHours())}` +
    `${p(d.getUTCMinutes())}` +
    `${p(d.getUTCSeconds())}`
  );
}

function vadsTransId(): string {
  return String(Math.floor(Math.random() * 900000)).padStart(6, "0");
}

function hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function base64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

// Signature Sogecommerce / Lyra (formulaire V2). Identique à l'aller du pro.
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

// ---------------------------------------------------------------------------
// Calcul du montant guest CÔTÉ SERVEUR
// (recopie de calculateGuestOrderTTC, src/components/payment/GuestPaymentDetailsSummary.tsx)
//   total = prix_carte_grise(montant_ht) + frais_dossier + options
//   options : sms +5, email +5, dossier_prioritaire +5, certificat_non_gage +10
// ---------------------------------------------------------------------------
function computeGuestTotal(order: any): number {
  const prixCarteGrise = Number(order.montant_ht) || 0;
  const fraisDossier = (order.frais_dossier === null || order.frais_dossier === undefined)
    ? 30
    : Number(order.frais_dossier);
  const sms = order.sms_notifications ? 5 : 0;
  const email = order.email_notifications ? 5 : 0;
  const prioritaire = order.dossier_prioritaire ? 5 : 0;
  const nonGage = order.certificat_non_gage ? 10 : 0;
  const EXPRESS_SURCHARGE: Record<string, number> = { DA: 5, DC: 5, CG: 10, CPI_WW: 99 };
  const expressSurcharge = order.express ? (EXPRESS_SURCHARGE[order.demarche_type] || 0) : 0;
  return prixCarteGrise + fraisDossier + sms + email + prioritaire + nonGage + expressSurcharge;
}

// ---------------------------------------------------------------------------
// Fonction principale
// ---------------------------------------------------------------------------
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- 1. Secrets Sogecommerce ----------------------------------------
    const siteId = Deno.env.get("SOGE_SITE_ID");
    const mode = (Deno.env.get("SOGE_MODE") || "TEST").toUpperCase();
    // Clé de signature choisie selon le mode : PRODUCTION -> SOGE_KEY_PROD, sinon SOGE_KEY_TEST.
    // SOGE_SIGNATURE_KEY reste accepté en dernier recours (compat ascendante).
    const modeKey = mode === "PRODUCTION"
      ? Deno.env.get("SOGE_KEY_PROD")
      : Deno.env.get("SOGE_KEY_TEST");
    const signatureKey = modeKey || Deno.env.get("SOGE_SIGNATURE_KEY");
    const signAlgo = (Deno.env.get("SOGE_SIGN_ALGO") || "HMAC-SHA-256").toUpperCase();
    const paymentUrl = Deno.env.get("SOGE_PAYMENT_URL") || DEFAULT_PAYMENT_URL;

    if (!siteId) throw new Error("SOGE_SITE_ID non configuré");
    if (!signatureKey) {
      throw new Error("Clé de signature manquante (SOGE_SIGNATURE_KEY ou SOGE_KEY_TEST)");
    }

    // --- 2. Corps de la requête -----------------------------------------
    const body = await req.json();
    const { orderId, returnUrl } = body;

    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- 3. Lecture de la commande (aucune auth : flux guest) -----------
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: order, error: orderError } = await supabaseClient
      .from("guest_orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Commande introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- 4. Vérifications (alignées sur le parcours Stripe) -------------
    // NB : on n'exige PAS documents_complets — sur ce site le particulier
    // paie D'ABORD, puis envoie ses documents APRÈS (comme la branche guest
    // de create-payment-intent, qui ne vérifie que amount/order_id).
    if (order.paye === true) {
      return new Response(JSON.stringify({ error: "Commande déjà payée" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- 5. Montant recalculé côté serveur ------------------------------
    const calculatedTotal = computeGuestTotal(order);
    const amountCents = Math.round(calculatedTotal * 100);
    if (amountCents <= 0) {
      return new Response(JSON.stringify({ error: "Montant invalide (0)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- 6. Champs vads_* du formulaire ---------------------------------
    const now = new Date();
    const fields: Record<string, string> = {
      vads_action_mode: "INTERACTIVE",
      vads_amount: String(amountCents),
      vads_ctx_mode: mode,
      vads_currency: "978", // EUR
      vads_order_id: String(orderId).slice(0, 64),
      vads_page_action: "PAYMENT",
      vads_payment_config: "SINGLE",
      vads_site_id: siteId,
      vads_trans_date: vadsTransDate(now),
      vads_trans_id: vadsTransId(),
      vads_version: "V2",
      // Étiquettes relues par le webhook :
      vads_ext_info_type: "guest_order",
      vads_ext_info_order_id: String(orderId),
      vads_ext_info_tracking: String(order.tracking_number || ""),
      vads_ext_info_flux: "carte_grise",
    };

    // Email du client pour le ticket de paiement (facultatif).
    if (order.email) fields.vads_cust_email = String(order.email);

    // URL de retour après paiement (facultative ici).
    const effectiveReturnUrl = returnUrl || Deno.env.get("SOGE_RETURN_URL");
    if (effectiveReturnUrl) fields.vads_url_return = String(effectiveReturnUrl);

    // --- 7. Signature ---------------------------------------------------
    const signature = await computeSignature(fields, signatureKey, signAlgo);

    // --- 8. Réponse : formulaire à POSTer vers la passerelle ------------
    return new Response(
      JSON.stringify({
        paymentUrl,
        method: "POST",
        fields: { ...fields, signature },
        debug: {
          amountCents,
          mode,
          signAlgo,
          transId: fields.vads_trans_id,
          transDate: fields.vads_trans_date,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Erreur create-sogecommerce-guest-payment:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
