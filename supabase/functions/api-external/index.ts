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

async function handleGetTypes() {
  const { data, error } = await supabase
    .from("guest_demarche_types")
    .select("code, titre, description, prix_base, actif, ordre")
    .eq("actif", true)
    .order("ordre");

  if (error) throw error;

  return jsonResponse({ success: true, types: data });
}

async function handleCreateOrder(body: any) {
  const { immatriculation, demarche_type, email } = body;

  // Validation
  if (!immatriculation) return errorResponse("immatriculation est requis");
  if (!demarche_type) return errorResponse("demarche_type est requis");
  if (!email) return errorResponse("email est requis");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return errorResponse("email invalide");

  // Get price from demarche type if not provided
  let montantHt = body.montant_ht;
  let fraisDossier = body.frais_dossier ?? 30;

  if (!montantHt) {
    const { data: typeData } = await supabase
      .from("guest_demarche_types")
      .select("prix_base")
      .eq("code", demarche_type)
      .single();

    montantHt = typeData?.prix_base || 0;
  }

  const montantTtc = montantHt + fraisDossier;

  // Create guest order
  const { data: order, error } = await supabase
    .from("guest_orders")
    .insert({
      immatriculation: immatriculation.toUpperCase().trim(),
      demarche_type,
      email,
      nom: body.nom || null,
      prenom: body.prenom || null,
      telephone: body.telephone || null,
      adresse: body.adresse || null,
      code_postal: body.code_postal || null,
      ville: body.ville || null,
      montant_ht: montantHt,
      montant_ttc: montantTtc,
      frais_dossier: fraisDossier,
      email_notifications: true,
      status: "en_attente",
      commentaire: body.source ? `Source: ${body.source}` : null,
    })
    .select("id, tracking_number, immatriculation, montant_ht, montant_ttc, frais_dossier, status, created_at")
    .single();

  if (error) {
    console.error("Insert error:", error);
    throw error;
  }

  const baseUrl = "https://discountcartegrise.fr";
  const trackingUrl = `${baseUrl}/suivi/${order.tracking_number}`;
  const paymentUrl = `${baseUrl}/demarche-simple?orderId=${order.id}&type=${demarche_type}&plaque=${encodeURIComponent(immatriculation)}`;

  // Send admin notification (non-blocking)
  try {
    await supabase.functions.invoke("send-email", {
      body: {
        type: "admin_new_guest_order",
        to: "contact@discountcartegrise.fr",
        data: {
          client_name: body.prenom && body.nom ? `${body.prenom} ${body.nom}` : email,
          client_email: email,
          client_phone: body.telephone || "Non renseigné",
          tracking_number: order.tracking_number,
          immatriculation: order.immatriculation,
          demarche_type,
          order_id: order.id,
          documents_count: 0,
        },
      },
    });
  } catch (e) {
    console.error("Admin notification failed:", e);
  }

  // Send client confirmation email (non-blocking)
  try {
    await supabase.functions.invoke("send-email", {
      body: {
        type: "guest_order_submitted",
        to: email,
        data: {
          prenom: body.prenom || "Client",
          nom: body.nom || "",
          tracking_number: order.tracking_number,
          immatriculation: order.immatriculation,
        },
      },
    });
  } catch (e) {
    console.error("Client email failed:", e);
  }

  return jsonResponse({
    success: true,
    order_id: order.id,
    tracking_number: order.tracking_number,
    tracking_url: trackingUrl,
    payment_url: paymentUrl,
    order: {
      ...order,
      demarche_type,
      email,
    },
  });
}

async function handleGetOrder(body: any) {
  const { tracking_number, order_id } = body;

  if (!tracking_number && !order_id) {
    return errorResponse("tracking_number ou order_id est requis");
  }

  // Fetch order
  let query = supabase.from("guest_orders").select("*");
  if (tracking_number) {
    query = query.eq("tracking_number", tracking_number);
  } else {
    query = query.eq("id", order_id);
  }

  const { data: order, error } = await query.single();
  if (error || !order) return errorResponse("Commande introuvable", 404);

  // Fetch documents
  const { data: documents } = await supabase
    .from("guest_order_documents")
    .select("id, type_document, nom_fichier, validation_status, rejection_reason, side, created_at")
    .eq("order_id", order.id)
    .order("created_at");

  // Fetch admin documents
  const { data: adminDocuments } = await supabase
    .from("guest_order_admin_documents")
    .select("id, nom_fichier, description, created_at")
    .eq("order_id", order.id)
    .order("created_at");

  // Fetch invoice
  const { data: facture } = await supabase
    .from("factures")
    .select("id, numero_facture, montant_ht, montant_ttc, created_at")
    .eq("guest_order_id", order.id)
    .single();

  // Strip sensitive fields
  const safeOrder = {
    id: order.id,
    tracking_number: order.tracking_number,
    status: order.status,
    immatriculation: order.immatriculation,
    demarche_type: order.demarche_type,
    email: order.email,
    nom: order.nom,
    prenom: order.prenom,
    telephone: order.telephone,
    montant_ht: order.montant_ht,
    montant_ttc: order.montant_ttc,
    frais_dossier: order.frais_dossier,
    paye: order.paye,
    paid_at: order.paid_at,
    documents_complets: order.documents_complets,
    created_at: order.created_at,
    updated_at: order.updated_at,
  };

  return jsonResponse({
    success: true,
    order: safeOrder,
    documents: documents || [],
    admin_documents: adminDocuments || [],
    facture: facture || null,
  });
}

async function handleCreatePaymentLink(body: any) {
  const { order_id, tracking_number } = body;

  if (!order_id && !tracking_number) {
    return errorResponse("order_id ou tracking_number est requis");
  }

  let query = supabase.from("guest_orders").select("id, tracking_number, demarche_type, immatriculation, paye");
  if (order_id) {
    query = query.eq("id", order_id);
  } else {
    query = query.eq("tracking_number", tracking_number);
  }

  const { data: order, error } = await query.single();
  if (error || !order) return errorResponse("Commande introuvable", 404);

  if (order.paye) {
    return jsonResponse({
      success: true,
      already_paid: true,
      tracking_url: `https://discountcartegrise.fr/suivi/${order.tracking_number}`,
    });
  }

  const paymentUrl = `https://discountcartegrise.fr/demarche-simple?orderId=${order.id}&type=${order.demarche_type}&plaque=${encodeURIComponent(order.immatriculation)}`;

  return jsonResponse({
    success: true,
    already_paid: false,
    payment_url: paymentUrl,
    tracking_url: `https://discountcartegrise.fr/suivi/${order.tracking_number}`,
  });
}

// ─── Main Handler ───

const handler = async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth check
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

      case "create_order":
        return await handleCreateOrder(body);

      case "get_order":
        return await handleGetOrder(body);

      case "create_payment_link":
        return await handleCreatePaymentLink(body);

      default:
        return errorResponse(
          `Action inconnue: ${action}. Actions disponibles: get_types, create_order, get_order, create_payment_link`
        );
    }
  } catch (error: any) {
    console.error("❌ API External error:", error);
    return errorResponse(error.message || "Erreur interne", 500);
  }
};

serve(handler);
