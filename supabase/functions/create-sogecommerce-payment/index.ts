// ============================================================================
// create-sogecommerce-payment
// ----------------------------------------------------------------------------
// Nouvelle fonction de paiement Sogecommerce (Société Générale), modèle
// REDIRECTION (page de paiement hébergée Société Générale).
//
// IMPORTANT :
//  - Cette fonction est ISOLÉE. Elle ne remplace pas encore Stripe.
//  - Elle ne modifie AUCUNE fonction Stripe et ne touche pas au dossier src/.
//  - Elle ne fait qu'un seul cas pour l'instant : le paiement d'une DÉMARCHE
//    par un garage connecté (modes pro_pays_all et split).
//  - Les règles de calcul du montant sont recopiées à l'identique depuis
//    create-payment-intent (rien n'est inventé, rien n'est cassé).
//  - Mode TEST uniquement (SOGE_MODE = TEST).
//
// Secrets Supabase utilisés :
//  - SOGE_SITE_ID          : identifiant de la boutique
//  - SOGE_KEY_TEST         : clé de TEST de la boutique
//  - SOGE_SIGNATURE_KEY    : clé de signature (voir note plus bas). Si absente,
//                            on retombe sur SOGE_KEY_TEST.
//  - SOGE_MODE             : "TEST" (ou "PRODUCTION" plus tard)
//  - SOGE_SIGN_ALGO        : "HMAC-SHA-256" (par défaut) ou "SHA-1" (optionnel)
//  - SOGE_PAYMENT_URL      : URL de la passerelle (optionnel, valeur par défaut)
//  - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY : accès base (lecture seule ici)
//
// NOTE SIGNATURE (à lire) :
//  Pour le formulaire de paiement hébergé (vads_*), la "clé de signature" EST
//  la clé de TEST/PRODUCTION de la boutique, que l'on trouve dans le Back Office
//  Société Générale : Paramétrage > Boutique > onglet "Clés".
//  Ce n'est PAS la clé d'API REST. On stocke cette valeur dans
//  SOGE_SIGNATURE_KEY (recommandé pour être explicite), ou à défaut on réutilise
//  SOGE_KEY_TEST si c'est déjà cette même valeur.
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    // --- 1. Lecture des secrets Sogecommerce ------------------------------
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

    // --- 2. Lecture du corps de la requête --------------------------------
    const body = await req.json();
    const { demarcheId, paymentType, paymentMode: requestedMode, returnUrl } = body;

    if (!demarcheId) {
      return new Response(JSON.stringify({ error: "demarcheId requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- 3. Authentification du garage ------------------------------------
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé - authentification manquante" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé - jeton invalide" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- 4. Récupération de la démarche et vérification de propriété -------
    const { data: demarche, error: demarcheError } = await supabaseClient
      .from("demarches")
      .select("*, garages!inner(*)")
      .eq("id", demarcheId)
      .single();

    if (demarcheError || !demarche) {
      return new Response(JSON.stringify({ error: "Démarche introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (demarche.garages.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- 5. Détermination du mode de paiement -----------------------------
    // (même logique que create-payment-intent)
    const paymentMode = requestedMode || demarche.payment_mode || "pro_pays_all";
    if (paymentMode === "client_pays_all") {
      return new Response(
        JSON.stringify({ error: "Le client est responsable du paiement pour cette démarche" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- 6. Calcul du montant CÔTÉ SERVEUR --------------------------------
    // Règles recopiées à l'identique depuis create-payment-intent.
    const { data: trackingServices } = await supabaseClient
      .from("tracking_services")
      .select("price")
      .eq("demarche_id", demarcheId);

    const optionsTotal = (trackingServices || []).reduce(
      (sum: number, s: any) => sum + Number(s.price || 0),
      0,
    );

    const prixCarteGrise = Number(demarche.prix_carte_grise) || 0;
    const fraisDossier = Number(demarche.frais_dossier) || 0;
    const totalServices = fraisDossier + optionsTotal;

    let calculatedTotal: number;
    if (paymentMode === "split") {
      // Mode split : le pro paie seulement frais de dossier + options.
      calculatedTotal = totalServices;
    } else {
      // pro_pays_all : montant complet.
      calculatedTotal = prixCarteGrise + totalServices;
    }

    const amountCents = Math.round(calculatedTotal * 100);
    if (amountCents <= 0) {
      return new Response(JSON.stringify({ error: "Montant invalide (0)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- 7. Étiquette de flux (une seule boutique) ------------------------
    // Même condition que l'ancien choix Stripe1 / Stripe2 :
    //   carte_grise  = ce qui partait sur Stripe 2
    //   frais_dossier = ce qui partait sur Stripe 1
    const useCarteGrise = paymentMode !== "split" && prixCarteGrise > 0;
    const flux = useCarteGrise ? "carte_grise" : "frais_dossier";

    // --- 8. Construction des champs vads_* du formulaire ------------------
    const now = new Date();
    const fields: Record<string, string> = {
      vads_action_mode: "INTERACTIVE",
      vads_amount: String(amountCents),
      vads_ctx_mode: mode, // TEST en bac à sable
      vads_currency: "978", // EUR
      vads_order_id: String(demarcheId).slice(0, 64),
      vads_page_action: "PAYMENT",
      vads_payment_config: "SINGLE",
      vads_site_id: siteId,
      vads_trans_date: vadsTransDate(now),
      vads_trans_id: vadsTransId(),
      vads_version: "V2",
      // Étiquettes personnalisées (relues plus tard par le webhook) :
      vads_ext_info_flux: flux,
      vads_ext_info_demarche_id: String(demarcheId),
      vads_ext_info_garage_id: String(demarche.garage_id || ""),
      vads_ext_info_payment_mode: paymentMode,
      vads_ext_info_payment_type: paymentType || "full",
    };

    // Email du garage pour le ticket de paiement (facultatif).
    const garageEmail = demarche.garages?.email;
    if (garageEmail) fields.vads_cust_email = String(garageEmail);

    // URL de retour après paiement (facultative ici ; la page l'enverra plus tard).
    const effectiveReturnUrl = returnUrl || Deno.env.get("SOGE_RETURN_URL");
    if (effectiveReturnUrl) fields.vads_url_return = String(effectiveReturnUrl);

    // --- 9. Signature -----------------------------------------------------
    const signature = await computeSignature(fields, signatureKey, signAlgo);

    // --- 10. Réponse : tout ce qu'il faut pour rediriger ------------------
    // Le navigateur construira un formulaire POST (champs + signature) vers
    // paymentUrl et le soumettra automatiquement.
    return new Response(
      JSON.stringify({
        paymentUrl,
        method: "POST",
        fields: { ...fields, signature },
        // Infos utiles pour le débogage / les logs côté site :
        debug: {
          amountCents,
          flux,
          mode,
          signAlgo,
          transId: fields.vads_trans_id,
          transDate: fields.vads_trans_date,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Erreur create-sogecommerce-payment:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
