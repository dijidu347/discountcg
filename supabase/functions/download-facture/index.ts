import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      .select("pdf_url, numero")
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
        JSON.stringify({ error: "PDF non disponible" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Télécharger le PDF depuis l'URL Supabase
    const pdfResponse = await fetch(facture.pdf_url);
    
    if (!pdfResponse.ok) {
      console.error("Erreur téléchargement PDF:", pdfResponse.status);
      return new Response(
        JSON.stringify({ error: "Impossible de télécharger le PDF" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pdfBytes = await pdfResponse.arrayBuffer();

    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="facture_${facture.numero}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Erreur:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
