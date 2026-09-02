import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EXTERNAL_API_KEY = Deno.env.get("EXTERNAL_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ─── Auth ───
function validateApiKey(req: Request): boolean {
  const key = req.headers.get("x-api-key");
  if (!key || !EXTERNAL_API_KEY) return false;
  return key === EXTERNAL_API_KEY;
}

// ─── Helpers ───
function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function errorResponse(message: string, status = 400) {
  return jsonResponse({ success: false, error: message }, status);
}

// ─── Actions ───

// List available demarche types (actions_rapides)
async function handleGetTypes() {
  const { data, error } = await supabase
    .from("actions_rapides")
    .select("id, type, titre, description, prix, icon, categorie, questionnaire_id, ordre")
    .eq("actif", true)
    .order("ordre");

  if (error) throw error;
  return jsonResponse({ success: true, types: data });
}

// Get garage info by API key or garage_id
async function handleGetGarage(body: any) {
  const { garage_id } = body;
  if (!garage_id) return errorResponse("garage_id est requis");

  const { data, error } = await supabase
    .from("garages")
    .select("id, raison_sociale, email, telephone, token_balance, free_token_available, unlimited_free_tokens, verified, siret, ville")
    .eq("id", garage_id)
    .single();

  if (error || !data) return errorResponse("Garage introuvable", 404);

  return jsonResponse({ success: true, garage: data });
}

// Create a demarche for a garage
async function handleCreateDemarche(body: any) {
  const { garage_id, type, immatriculation, payment_mode, client_email, client_phone, commentaire, prix_carte_grise } = body;

  // Validation
  if (!garage_id) return errorResponse("garage_id est requis");
  if (!type) return errorResponse("type est requis (DA, DC, CG, etc.)");
  if (!immatriculation) return errorResponse("immatriculation est requis");

  // Verify garage exists
  const { data: garage, error: garageError } = await supabase
    .from("garages")
    .select("id, raison_sociale, email, token_balance, free_token_available, unlimited_free_tokens, verified")
    .eq("id", garage_id)
    .single();

  if (garageError || !garage) return errorResponse("Garage introuvable", 404);

  // Get action details for pricing
  const { data: action } = await supabase
    .from("actions_rapides")
    .select("prix, titre, type")
    .eq("type", type)
    .eq("actif", true)
    .single();

  const fraisDossier = action?.prix || 0;
  const carteGrise = prix_carte_grise || 0;
  const totalHt = fraisDossier;
  const totalTtc = carteGrise + fraisDossier;

  // Check if free token applies (DA/DC only)
  const isFreeToken = (type === 'DA' || type === 'DC') && (garage.free_token_available || garage.unlimited_free_tokens);

  // Determine payment mode
  const effectivePaymentMode = payment_mode || 'pro_pays_all';

  // Validate client_email for client payment modes
  if ((effectivePaymentMode === 'client_pays_all' || effectivePaymentMode === 'split') && !client_email) {
    return errorResponse("client_email est requis pour le mode de paiement " + effectivePaymentMode);
  }

  // Create demarche
  const { data: demarche, error: insertError } = await supabase
    .from("demarches")
    .insert({
      garage_id,
      type,
      immatriculation: immatriculation.toUpperCase().trim(),
      commentaire: commentaire || null,
      prix_carte_grise: carteGrise,
      frais_dossier: isFreeToken ? 0 : fraisDossier,
      montant_ht: isFreeToken ? 0 : totalHt,
      montant_ttc: isFreeToken ? 0 : totalTtc,
      status: "en_saisie",
      is_draft: true,
      paye: false,
      is_free_token: isFreeToken,
      payment_mode: effectivePaymentMode,
      client_email: client_email || null,
      client_phone: client_phone || null,
    })
    .select("id, numero_demarche, type, immatriculation, status, frais_dossier, prix_carte_grise, montant_ht, montant_ttc, is_free_token, payment_mode, created_at")
    .single();

  if (insertError) {
    console.error("Insert error:", insertError);
    throw insertError;
  }

  const baseUrl = "https://discountcartegrise.fr";

  // Build response with useful URLs
  const response: any = {
    success: true,
    demarche_id: demarche.id,
    numero_demarche: demarche.numero_demarche,
    demarche_url: `${baseUrl}/demarche/${demarche.id}`,
    demarche: {
      ...demarche,
      garage_id,
      is_free_token: isFreeToken,
    },
  };

  // Add payment URL based on mode
  if (effectivePaymentMode === 'client_pays_all') {
    response.client_payment_url = `${baseUrl}/paiement-demarche/${demarche.id}?mode=client_pays_all`;
  } else if (effectivePaymentMode === 'split') {
    response.pro_payment_url = `${baseUrl}/paiement-demarche/${demarche.id}?mode=split`;
  } else {
    response.payment_url = `${baseUrl}/paiement-demarche/${demarche.id}`;
  }

  // Send admin notification
  try {
    await supabase.functions.invoke("send-email", {
      body: {
        type: "admin_new_demarche",
        to: "contact@discountcartegrise.fr",
        data: {
          type: type,
          reference: demarche.numero_demarche || demarche.id,
          immatriculation,
          client_name: garage.raison_sociale,
          montant_ttc: totalTtc.toFixed(2),
          is_free_token: isFreeToken,
        },
      },
    });
  } catch (e) { console.error("Admin notif failed:", e); }

  return jsonResponse(response);
}

// Pay with tokens (balance)
async function handlePayWithTokens(body: any) {
  const { garage_id, demarche_id } = body;

  if (!garage_id) return errorResponse("garage_id est requis");
  if (!demarche_id) return errorResponse("demarche_id est requis");

  // Get garage
  const { data: garage, error: gErr } = await supabase
    .from("garages")
    .select("id, token_balance, free_token_available, unlimited_free_tokens")
    .eq("id", garage_id)
    .single();

  if (gErr || !garage) return errorResponse("Garage introuvable", 404);

  // Get demarche
  const { data: demarche, error: dErr } = await supabase
    .from("demarches")
    .select("id, frais_dossier, paye, type, is_free_token, garage_id")
    .eq("id", demarche_id)
    .single();

  if (dErr || !demarche) return errorResponse("Démarche introuvable", 404);
  if (demarche.garage_id !== garage_id) return errorResponse("Cette démarche n'appartient pas à ce garage", 403);
  if (demarche.paye) return jsonResponse({ success: true, already_paid: true });

  // Free token for DA/DC
  if (demarche.is_free_token) {
    // Consume free token
    if (!garage.unlimited_free_tokens) {
      await supabase.from("garages").update({ free_token_available: false }).eq("id", garage_id);
    }
    await supabase.from("demarches").update({
      paye: true, paid_with_tokens: true, is_draft: false, status: "en_saisie",
    }).eq("id", demarche_id);

    return jsonResponse({ success: true, paid: true, method: "free_token" });
  }

  // Coût en jetons. 1 jeton = 1 € : token_balance est stocké EN EUROS.
  const tokenCost = Number(demarche.frais_dossier) || 0;

  if (garage.token_balance < tokenCost) {
    return errorResponse(`Solde insuffisant. Requis: ${tokenCost} €, Disponible: ${garage.token_balance} €`, 402);
  }

  // Deduct tokens (arrondi au centime, comme les autres chemins de débit)
  await supabase.from("garages").update({
    token_balance: Math.round((garage.token_balance - tokenCost) * 100) / 100,
  }).eq("id", garage_id);

  // Mark as paid
  await supabase.from("demarches").update({
    paye: true, paid_with_tokens: true, is_draft: false,
  }).eq("id", demarche_id);

  return jsonResponse({
    success: true,
    paid: true,
    method: "tokens",
    tokens_used: tokenCost,
    tokens_remaining: Math.round((garage.token_balance - tokenCost) * 100) / 100,
  });
}

// Get demarche status
async function handleGetDemarche(body: any) {
  const { demarche_id, numero_demarche, garage_id } = body;

  if (!demarche_id && !numero_demarche) {
    return errorResponse("demarche_id ou numero_demarche est requis");
  }

  let query = supabase.from("demarches").select("*");
  if (demarche_id) {
    query = query.eq("id", demarche_id);
  } else {
    query = query.eq("numero_demarche", numero_demarche);
  }
  if (garage_id) {
    query = query.eq("garage_id", garage_id);
  }

  const { data: demarche, error } = await query.single();
  if (error || !demarche) return errorResponse("Démarche introuvable", 404);

  // Get documents
  const { data: documents } = await supabase
    .from("documents")
    .select("id, type_document, nom_fichier, validation_status, validation_comment, created_at")
    .eq("demarche_id", demarche.id)
    .order("created_at");

  // Get facture
  const { data: facture } = await supabase
    .from("factures")
    .select("id, numero, montant_ht, montant_ttc, pdf_url, created_at")
    .eq("demarche_id", demarche.id)
    .single();

  return jsonResponse({
    success: true,
    demarche: {
      id: demarche.id,
      numero_demarche: demarche.numero_demarche,
      garage_id: demarche.garage_id,
      type: demarche.type,
      status: demarche.status,
      immatriculation: demarche.immatriculation,
      frais_dossier: demarche.frais_dossier,
      prix_carte_grise: demarche.prix_carte_grise,
      montant_ht: demarche.montant_ht,
      montant_ttc: demarche.montant_ttc,
      paye: demarche.paye,
      paid_with_tokens: demarche.paid_with_tokens,
      is_free_token: demarche.is_free_token,
      payment_mode: demarche.payment_mode,
      client_email: demarche.client_email,
      client_paid: demarche.client_paid,
      documents_complets: demarche.documents_complets,
      is_draft: demarche.is_draft,
      created_at: demarche.created_at,
      updated_at: demarche.updated_at,
    },
    documents: documents || [],
    facture: facture || null,
  });
}

// List demarches for a garage
async function handleListDemarches(body: any) {
  const { garage_id, status, limit: queryLimit } = body;

  if (!garage_id) return errorResponse("garage_id est requis");

  let query = supabase
    .from("demarches")
    .select("id, numero_demarche, type, immatriculation, status, montant_ttc, paye, is_free_token, payment_mode, created_at")
    .eq("garage_id", garage_id)
    .order("created_at", { ascending: false })
    .limit(queryLimit || 50);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;

  return jsonResponse({ success: true, demarches: data, count: data?.length || 0 });
}

// ─── Main Handler ───

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!validateApiKey(req)) {
    return errorResponse("Clé API invalide ou manquante", 401);
  }

  try {
    const body = await req.json();
    const { action } = body;

    console.log(`🔌 API External: action=${action}`);

    switch (action) {
      case "get_types":
        return await handleGetTypes();
      case "get_garage":
        return await handleGetGarage(body);
      case "create_demarche":
        return await handleCreateDemarche(body);
      case "pay_with_tokens":
        return await handlePayWithTokens(body);
      case "get_demarche":
        return await handleGetDemarche(body);
      case "list_demarches":
        return await handleListDemarches(body);
      default:
        return errorResponse(
          `Action inconnue: ${action}. Actions: get_types, get_garage, create_demarche, pay_with_tokens, get_demarche, list_demarches`
        );
    }
  } catch (error: any) {
    console.error("❌ API External error:", error);
    return errorResponse(error.message || "Erreur interne", 500);
  }
};

serve(handler);
