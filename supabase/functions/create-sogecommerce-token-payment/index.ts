// ============================================================================
// create-sogecommerce-token-payment
// ----------------------------------------------------------------------------
// Recharge de solde (jetons) d'un garage via Sogecommerce, page de paiement
// hebergee Societe Generale. Remplace create-token-payment-intent (Stripe).
//
// Le prix vient toujours de token_pricing, jamais du navigateur. Le credit du
// solde, l'enregistrement de l'achat et la facture sont faits par
// webhook-sogecommerce a reception de l'IPN (vads_ext_info_type =
// "token_purchase").
//
// Secrets : les memes que create-sogecommerce-payment (SOGE_SITE_ID, SOGE_MODE,
// SOGE_KEY_PROD / SOGE_KEY_TEST / SOGE_SIGNATURE_KEY, SOGE_SIGN_ALGO,
// SOGE_PAYMENT_URL).
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Adresses de retour autorisees : jamais de redirection vers un site tiers.
const ORIGINES_AUTORISEES = [
  /^https:\/\/(www\.)?discountcartegrise\.(fr|com)$/,
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/,
  /^http:\/\/localhost:\d+$/,
];

function origineSure(origine: unknown): string {
  const o = typeof origine === "string" ? origine.replace(/\/+$/, "") : "";
  return ORIGINES_AUTORISEES.some((r) => r.test(o)) ? o : "https://discountcartegrise.fr";
}

function reponse(corps: unknown, status = 200): Response {
  return new Response(JSON.stringify(corps), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// URL par défaut de la passerelle de paiement hébergée Sogecommerce.
const DEFAULT_PAYMENT_URL = "https://sogecommerce.societegenerale.eu/vads-payment/";

// ---------------------------------------------------------------------------
// Outils
// ---------------------------------------------------------------------------

// Date au format attendu par Sogecommerce : AAAAMMJJHHMMSS, en UTC.
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

// Identifiant de transaction : 6 chiffres, entre 000000 et 899999, unique
// dans la journée. (Suffisant pour les tests ; à robustifier si besoin.)
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

// Calcul de la signature Sogecommerce / Systempay (technologie Lyra/PayZen).
//
// Règle officielle du formulaire V2 :
//  1. On prend tous les champs dont le nom commence par "vads_".
//  2. On trie ces champs par ordre alphabétique de leur NOM.
//  3. On colle leurs VALEURS séparées par "+", puis on ajoute "+" et la clé.
//     => "valeur1+valeur2+...+valeurN+CLE"
//  4. HMAC-SHA-256 : signature = base64( hmac_sha256(chaine, CLE) )
//     SHA-1        : signature = sha1_hex(chaine)
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

  // Par défaut : HMAC-SHA-256 (recommandé par Sogecommerce).
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
    const siteId = Deno.env.get("SOGE_SITE_ID");
    const mode = (Deno.env.get("SOGE_MODE") || "TEST").toUpperCase();
    const modeKey = mode === "PRODUCTION"
      ? Deno.env.get("SOGE_KEY_PROD")
      : Deno.env.get("SOGE_KEY_TEST");
    const signatureKey = modeKey || Deno.env.get("SOGE_SIGNATURE_KEY");
    const signAlgo = (Deno.env.get("SOGE_SIGN_ALGO") || "HMAC-SHA-256").toUpperCase();
    const paymentUrl = Deno.env.get("SOGE_PAYMENT_URL") || DEFAULT_PAYMENT_URL;
    if (!siteId) throw new Error("SOGE_SITE_ID non configuré");
    if (!signatureKey) throw new Error("Clé de signature Sogecommerce manquante");

    const { packId, origin } = await req.json();
    if (!packId) return reponse({ error: "Pack de recharge requis" }, 400);

    // --- Garage connecte ---------------------------------------------------
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return reponse({ error: "Non autorisé - authentification manquante" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userError || !user) return reponse({ error: "Non autorisé - jeton invalide" }, 401);

    const { data: garage } = await supabase
      .from("garages")
      .select("id, email")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!garage) return reponse({ error: "Garage introuvable" }, 404);

    // --- Prix du pack, lu en base ------------------------------------------
    const { data: pack } = await supabase
      .from("token_pricing")
      .select("id, quantity, price")
      .eq("id", packId)
      .eq("active", true)
      .maybeSingle();
    if (!pack) return reponse({ error: "Pack de crédits invalide ou inactif" }, 400);

    const amountCents = Math.round(Number(pack.price) * 100);
    if (!(amountCents > 0)) return reponse({ error: "Montant invalide" }, 400);

    // --- Champs du formulaire ----------------------------------------------
    const base = origineSure(origin);
    const retour = `${base}/paiement-recharge?packId=${encodeURIComponent(String(pack.id))}`;
    const now = new Date();
    const transDate = vadsTransDate(now);
    const transId = vadsTransId();
    const fields: Record<string, string> = {
      vads_action_mode: "INTERACTIVE",
      vads_amount: String(amountCents),
      vads_ctx_mode: mode,
      vads_currency: "978",
      vads_order_id: `JETONS-${transDate}-${transId}`,
      vads_page_action: "PAYMENT",
      vads_payment_config: "SINGLE",
      vads_site_id: siteId,
      vads_trans_date: transDate,
      vads_trans_id: transId,
      vads_version: "V2",
      vads_ext_info_type: "token_purchase",
      vads_ext_info_flux: "frais_dossier",
      vads_ext_info_garage_id: String(garage.id),
      vads_ext_info_pack_id: String(pack.id),
      vads_url_success: `${base}/paiement-recharge-succes?amount=${pack.quantity}`,
      vads_url_return: retour,
      vads_url_refused: `${retour}&paiement=refuse`,
      vads_url_cancel: `${retour}&paiement=annule`,
      vads_url_error: `${retour}&paiement=refuse`,
    };
    if (garage.email) fields.vads_cust_email = String(garage.email);

    const signature = await computeSignature(fields, signatureKey, signAlgo);
    return reponse({ paymentUrl, method: "POST", fields: { ...fields, signature } });
  } catch (error: any) {
    console.error("Erreur create-sogecommerce-token-payment:", error);
    return reponse({ error: error?.message || "Erreur inconnue" }, 500);
  }
});
