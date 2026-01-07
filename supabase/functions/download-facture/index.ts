import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { factureId } = await req.json();

    if (!factureId) {
      return new Response(
        JSON.stringify({ error: "factureId requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Récupérer la facture
    const { data: facture, error: factureError } = await supabase
      .from("factures")
      .select("id, pdf_url, numero, garage_id, token_purchase_id, demarche_id")
      .eq("id", factureId)
      .single();

    if (factureError || !facture) {
      console.error("Erreur facture:", factureError);
      return new Response(
        JSON.stringify({ error: "Facture non trouvée" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!facture.pdf_url) {
      return new Response(
        JSON.stringify({ error: "PDF non disponible pour cette facture" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extraire le chemin du fichier depuis l'URL
    let filePath = facture.pdf_url;
    
    // Si c'est une URL complète, extraire le chemin après /factures/
    if (filePath.includes("/storage/v1/object/")) {
      const match = filePath.match(/\/storage\/v1\/object\/(?:public|sign)\/factures\/(.+)/);
      if (match) {
        filePath = decodeURIComponent(match[1]);
      }
    } else if (filePath.includes("/factures/")) {
      const match = filePath.match(/\/factures\/(.+)$/);
      if (match) {
        filePath = decodeURIComponent(match[1]);
      }
    } else if (filePath.startsWith("factures/")) {
      filePath = filePath.replace("factures/", "");
    }
    
    // Remove query params
    filePath = filePath.split("?")[0];

    console.log("Tentative URL signée pour:", filePath);

    // Essayer de créer une URL signée
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("factures")
      .createSignedUrl(filePath, 60);

    if (!signedUrlError && signedUrlData?.signedUrl) {
      console.log("✅ URL signée créée");
      return new Response(
        JSON.stringify({ signedUrl: signedUrlData.signedUrl, filename: `facture_${facture.numero}.pdf` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Premier essai échoué, tentative avec variantes...");

    // Essayer des variantes de chemin pour les factures jetons
    const candidates = [
      `${facture.garage_id}/${facture.numero}.pdf`,
      `${facture.garage_id}/tokens-${facture.numero}.pdf`,
      `${facture.numero}.pdf`,
      `tokens-${facture.numero}.pdf`,
    ];

    for (const candidate of candidates) {
      const { data: retryData, error: retryError } = await supabase.storage
        .from("factures")
        .createSignedUrl(candidate, 60);

      if (!retryError && retryData?.signedUrl) {
        console.log("✅ URL signée créée avec:", candidate);
        return new Response(
          JSON.stringify({ signedUrl: retryData.signedUrl, filename: `facture_${facture.numero}.pdf` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.error("Aucun fichier trouvé pour:", filePath);
    return new Response(
      JSON.stringify({ error: "Fichier de facture introuvable" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Erreur:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
