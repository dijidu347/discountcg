// ============================================================================
// create-sogecommerce-client-payment
// ----------------------------------------------------------------------------
// Paiement Sogecommerce (Société Générale) de la PART CLIENT d'une démarche,
// via le LIEN reçu par email (token). Modèle REDIRECTION (page hébergée).
// Équivalent de create-client-payment-intent, mais pour Sogecommerce.
//
// PÉRIMÈTRE :
//  - Gère le client d'un garage qui paie sa part (modes client_pays_all et split).
//  - PUBLIQUE : aucune authentification (verify_jwt = false). On s'appuie sur le
//    token (demarches.client_payment_token), comme le fait Stripe.
//  - Le montant est RECALCULÉ CÔTÉ SERVEUR (on ne fait pas confiance au front) :
//      client_pays_all → prix_carte_grise + frais_dossier + options
//      split           → prix_carte_grise seul (le pro a déjà payé sa part)
//
// ISOLATION :
//  - Fonction autonome. Ne touche NI à create-client-payment-intent NI à src/.
//  - computeSignature et les outils vads_* recopiés de create-sogecommerce-payment.
//  - Mode TEST (SOGE_MODE = TEST).
//
// Étiquettes posées pour le webhook (relues par webhook-sogecommerce) :
//  - vads_ext_info_type        = "client_payment"
//  - vads_ext_info_demarche_id = id technique de la démarche (lookup fiable)
//  - vads_ext_info_payment_mode = "client_pays_all" | "split"
//  - vads_order_id             = numero_demarche (lisible dans le BO SG)
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
// Fonction principale
// ---------------------------------------------------------------------------
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- 1. Secrets Sogecommerce ----------------------------------------
    const siteId = Deno.env.get("SOGE_SITE_ID");
    const testKey = Deno.env.get("SOGE_KEY_TEST");
    const signatureKey = Deno.env.get("SOGE_SIGNATURE_KEY") || testKey;
    const mode = (Deno.env.get("SOGE_MODE") || "TEST").toUpperCase();
    const signAlgo = (Deno.env.get("SOGE_SIGN_ALGO") || "HMAC-SHA-256").toUpperCase();
    const paymentUrl = Deno.env.get("SOGE_PAYMENT_URL") || DEFAULT_PAYMENT_URL;

    if (!siteId) throw new Error("SOGE_SITE_ID non configuré");
    if (!signatureKey) {
      throw new Error("Clé de signature manquante (SOGE_SIGNATURE_KEY ou SOGE_KEY_TEST)");
    }

    // --- 2. Corps de la requête -----------------------------------------
    const body = await req.json();
    const { token, returnUrl } = body;

    if (!token) {
      return new Response(JSON.stringify({ error: "token requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- 3. Lecture de la démarche par token (aucune auth) --------------
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: demarche, error: demarcheError } = await supabaseClient
      .from("demarches")
      .select("*, garages(*)")
      .eq("client_payment_token", token)
      .single();

    if (demarcheError || !demarche) {
      return new Response(JSON.stringify({ error: "Lien de paiement invalide ou expiré" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- 4. Vérifications (mêmes garde-fous que create-client-payment-intent) ---
    // Token expiré ?
    if (demarche.client_payment_token_expires_at) {
      const expiresAt = new Date(demarche.client_payment_token_expires_at);
      if (expiresAt < new Date()) {
        return new Response(JSON.stringify({ error: "Ce lien de paiement a expiré" }), {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    // Déjà payé ?
    if (demarche.client_paid) {
      return new Response(JSON.stringify({ error: "Ce paiement a déjà été effectué" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Mode valide ?
    const paymentMode = demarche.payment_mode;
    if (paymentMode !== "client_pays_all" && paymentMode !== "split") {
      return new Response(JSON.stringify({ error: "Mode de paiement invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- 5. Montant recalculé côté serveur ------------------------------
    const { data: trackingServices } = await supabaseClient
      .from("tracking_services")
      .select("price")
      .eq("demarche_id", demarche.id);

    const optionsTotal = (trackingServices || []).reduce(
      (sum: number, s: any) => sum + Number(s.price || 0),
      0,
    );

    const prixCarteGrise = Number(demarche.prix_carte_grise) || 0;
    const fraisDossier = Number(demarche.frais_dossier) || 0;

    let calculatedTotal: number;
    if (paymentMode === "client_pays_all") {
      // Client paie tout : carte grise + frais de dossier + options
      calculatedTotal = prixCarteGrise + fraisDossier + optionsTotal;
    } else {
      // split : client paie seulement la carte grise
      calculatedTotal = prixCarteGrise;
    }

    const amountCents = Math.round(calculatedTotal * 100);
    if (amountCents <= 0) {
      return new Response(JSON.stringify({ error: "Montant de paiement invalide" }), {
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
      // numero_demarche lisible dans le Back Office SG (≤ 64 car.) :
      vads_order_id: String(demarche.numero_demarche || demarche.id).slice(0, 64),
      vads_page_action: "PAYMENT",
      vads_payment_config: "SINGLE",
      vads_site_id: siteId,
      vads_trans_date: vadsTransDate(now),
      vads_trans_id: vadsTransId(),
      vads_version: "V2",
      // Étiquettes relues par le webhook :
      vads_ext_info_type: "client_payment",
      vads_ext_info_demarche_id: String(demarche.id), // id technique = lookup fiable
      vads_ext_info_payment_mode: paymentMode,
      vads_ext_info_flux: "carte_grise",
    };

    // Email du client pour le ticket de paiement (facultatif).
    if (demarche.client_email) fields.vads_cust_email = String(demarche.client_email);

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
          paymentMode,
          mode,
          signAlgo,
          transId: fields.vads_trans_id,
          transDate: fields.vads_trans_date,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Erreur create-sogecommerce-client-payment:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
