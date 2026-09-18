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
//   options : sms +5, certificat_non_gage +10
//   NB : l'option "Suivi email" (+5) a été SUPPRIMÉE de la facturation guest.
//        La colonne email_notifications reste (le suivi email est gratuit et
//        ne déclenche aucun envoi conditionnel), mais n'est PLUS facturée.
//   NB : la PRIORITÉ n'est facturée QUE via la colonne `express` (surcoût selon
//        le type). La colonne `dossier_prioritaire` désigne la même notion mais
//        n'est jamais renseignée par le parcours ; elle n'est donc PLUS
//        additionnée ici pour éviter toute double facturation de la priorité.
// ---------------------------------------------------------------------------
function computeGuestTotal(order: any): number {
  const prixCarteGrise = Number(order.montant_ht) || 0;
  const fraisDossier = (order.frais_dossier === null || order.frais_dossier === undefined)
    ? 30
    : Number(order.frais_dossier);
  const sms = order.sms_notifications ? 5 : 0;
  const nonGage = order.certificat_non_gage ? 10 : 0;
  const EXPRESS_SURCHARGE: Record<string, number> = { DA: 5, DC: 5, CG: 10, CPI_WW: 99 };
  const expressSurcharge = order.express ? (EXPRESS_SURCHARGE[order.demarche_type] || 0) : 0;
  return prixCarteGrise + fraisDossier + sms + nonGage + expressSurcharge;
}

// ---------------------------------------------------------------------------
// Taxe de carte grise recalculée CÔTÉ SERVEUR
// ----------------------------------------------------------------------------
// Le simulateur calcule la taxe dans le navigateur et l'enregistre dans
// guest_orders.montant_ht, que le client peut réécrire : il aurait pu payer 30 €
// une carte grise à 400 €. On refait donc ici le calcul de
// src/utils/calculatePrice.ts, avec :
//   - les frais de la démarche lus dans le catalogue (guest_demarche_types) ;
//   - le tarif du département choisi dans le simulateur ;
//   - la puissance, la date et le genre lus au SIV (vehicle_cache, inaccessible
//     au client) quand la plaque y figure, sinon ceux saisis sur la commande.
// Listes recopiées de src/lib/taxeCarteGrise.ts et calculatePrice.ts.
// ---------------------------------------------------------------------------
const DEMARCHES_AVEC_TAXE = ["CG", "SUCCESSION", "CG_NEUF", "CPI_WW"];
const GENRES_AVEC_TAXE_PARAFISCALE = ["CTTE"];
const MOTO_GENRES = ["MTL", "MTT1", "MTT2"];
const GENRES_EXONERES_Y1 = ["CL", "TRA", "MAGA", "REM", "SREM"];

class PrixARecalculer extends Error {}

function ageVehicule(dateMec: string): number {
  let date: Date;
  if (dateMec.includes("-")) {
    const p = dateMec.split("-");
    date = p[0].length === 4 ? new Date(dateMec) : new Date(`${p[2]}-${p[1]}-${p[0]}`);
  } else if (dateMec.includes("/")) {
    const p = dateMec.split("/");
    date = new Date(`${p[2]}-${p[1]}-${p[0]}`);
  } else {
    throw new PrixARecalculer("Date de mise en circulation invalide");
  }
  if (isNaN(date.getTime())) throw new PrixARecalculer("Date de mise en circulation invalide");
  const now = new Date();
  const age = now.getFullYear() - date.getFullYear();
  const mois = now.getMonth() - date.getMonth();
  return mois < 0 || (mois === 0 && now.getDate() < date.getDate()) ? age - 1 : age;
}

function taxeCarteGrise(tarif: number, chevaux: number, dateMec: string, genre: string): number {
  const g = (genre || "").toUpperCase();
  const anciennete = ageVehicule(dateMec);
  const parafiscale = GENRES_AVEC_TAXE_PARAFISCALE.includes(g) ? 34 : 0;
  let prixCV = chevaux * tarif;
  if (GENRES_EXONERES_Y1.includes(g)) prixCV = 0;
  else if (MOTO_GENRES.includes(g)) prixCV = prixCV * 0.5;
  else if (anciennete >= 10) prixCV = prixCV * 0.5;
  const sousTotalArrondi = Math.ceil(Math.round((prixCV + parafiscale + 11) * 100) / 100);
  return sousTotalArrondi + (g === "CL" ? 0 : 2.76);
}

async function calculerCommande(
  supabase: any,
  order: any,
  departement: string | undefined,
): Promise<{ taxe: number; frais: number }> {
  const { data: type } = await supabase
    .from("guest_demarche_types")
    .select("prix_base")
    .eq("code", order.demarche_type)
    .maybeSingle();
  const frais = type?.prix_base != null
    ? Number(type.prix_base)
    : (order.frais_dossier == null ? 30 : Number(order.frais_dossier));

  if (!DEMARCHES_AVEC_TAXE.includes(order.demarche_type)) return { taxe: 0, frais };

  if (!departement) {
    throw new PrixARecalculer("Le prix de votre carte grise doit être recalculé : refaites la simulation depuis le site.");
  }
  const { data: tarifDep } = await supabase
    .from("department_tariffs")
    .select("tarif")
    .eq("code", departement)
    .maybeSingle();
  if (!tarifDep?.tarif) throw new PrixARecalculer("Département inconnu : refaites la simulation depuis le site.");

  let chevaux = Number(order.puiss_fisc) || 0;
  let dateMec: string = order.date_mec || "";
  let genre: string = order.genre || "";

  const plaque = String(order.immatriculation || "").replace(/[-\s]/g, "").toUpperCase();
  if (plaque) {
    const { data: cache } = await supabase
      .from("vehicle_cache")
      .select("found, data")
      .eq("plate", plaque)
      .maybeSingle();
    const siv = cache?.found ? cache.data : null;
    if (Number(siv?.puissance_fiscale) > 0) chevaux = Number(siv.puissance_fiscale);
    if (siv?.date_mec) dateMec = siv.date_mec;
    if (siv?.genre) genre = siv.genre;
  }
  if (!dateMec && order.demarche_type === "CG_NEUF") dateMec = new Date().toISOString().slice(0, 10);

  if (!(chevaux > 0) || !dateMec) {
    throw new PrixARecalculer("Les informations du véhicule sont incomplètes : refaites la simulation depuis le site.");
  }
  return { taxe: taxeCarteGrise(Number(tarifDep.tarif), chevaux, dateMec, genre), frais };
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
    const { orderId, returnUrl, departement } = body;

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
    // Taxe et frais refaits ici puis réécrits sur la commande : la facture,
    // l'admin et les statistiques lisent ces colonnes.
    let calcul: { taxe: number; frais: number };
    try {
      calcul = await calculerCommande(supabaseClient, order, departement);
    } catch (e) {
      if (e instanceof PrixARecalculer) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw e;
    }
    if (Math.abs(calcul.taxe - (Number(order.montant_ht) || 0)) > 0.009 ||
        Math.abs(calcul.frais - (Number(order.frais_dossier) || 0)) > 0.009) {
      console.warn(`Montant corrige pour ${orderId} : taxe ${order.montant_ht} -> ${calcul.taxe}, frais ${order.frais_dossier} -> ${calcul.frais}`);
    }
    order.montant_ht = calcul.taxe;
    order.frais_dossier = calcul.frais;
    const calculatedTotal = computeGuestTotal(order);
    const { error: majError } = await supabaseClient
      .from("guest_orders")
      .update({ montant_ht: calcul.taxe, frais_dossier: calcul.frais, montant_ttc: calculatedTotal })
      .eq("id", orderId);
    if (majError) throw new Error(`Mise à jour du montant impossible : ${majError.message}`);
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
      vads_order_id: String(order.tracking_number || orderId).slice(0, 64),
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
