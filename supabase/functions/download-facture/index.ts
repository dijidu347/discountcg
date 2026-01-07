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

    const json = (obj: unknown, status = 200) =>
      new Response(JSON.stringify(obj), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const tryExtractPath = (pdfUrl: string): string => {
      let filePath = pdfUrl;

      // If it's a full storage URL, extract path after /factures/
      if (filePath.includes("/storage/v1/object/")) {
        const match = filePath.match(
          /\/storage\/v1\/object\/(?:public|sign)\/factures\/(.+)/
        );
        if (match) filePath = decodeURIComponent(match[1]);
      } else if (filePath.includes("/factures/")) {
        const match = filePath.match(/\/factures\/(.+)$/);
        if (match) filePath = decodeURIComponent(match[1]);
      } else if (filePath.startsWith("factures/")) {
        filePath = filePath.replace("factures/", "");
      }

      // Remove query params
      return filePath.split("?")[0];
    };

    const objectExists = async (path: string): Promise<boolean> => {
      const clean = path.replace(/^\/+/, "").split("?")[0];
      const folder = clean.includes("/") ? clean.split("/").slice(0, -1).join("/") : "";
      const filename = clean.includes("/") ? clean.split("/").pop()! : clean;

      const { data, error } = await supabase.storage
        .from("factures")
        .list(folder, { search: filename, limit: 10 });

      if (error) {
        console.error("Erreur list() storage:", { folder, filename, error });
        return false;
      }

      return (data || []).some((o: any) => o?.name === filename);
    };

    // Récupérer la facture
    const { data: facture, error: factureError } = await supabase
      .from("factures")
      .select("id, pdf_url, numero, garage_id, token_purchase_id, demarche_id")
      .eq("id", factureId)
      .single();

    if (factureError || !facture) {
      console.error("Erreur facture:", factureError);
      return json({ error: "Facture non trouvée" }, 404);
    }

    if (!facture.pdf_url) {
      return json({ error: "PDF non disponible pour cette facture" }, 404);
    }

    const extracted = tryExtractPath(String(facture.pdf_url));

    // IMPORTANT: createSignedUrl() peut réussir même si le fichier n'existe plus.
    // On vérifie donc l'existence et on tente des variantes (anciennes nomenclatures).
    const candidates = Array.from(
      new Set(
        [
          extracted,
          // anciennes factures jetons possibles
          facture.garage_id ? `${facture.garage_id}/${facture.numero}.pdf` : null,
          facture.garage_id ? `${facture.garage_id}/tokens-${facture.numero}.pdf` : null,
          // si pdf_url était stocké sans dossier
          `${facture.numero}.pdf`,
          `tokens-${facture.numero}.pdf`,
        ].filter(Boolean) as string[]
      )
    );

    let resolvedPath: string | null = null;
    for (const c of candidates) {
      const clean = c.replace(/^\/+/, "");
      if (await objectExists(clean)) {
        resolvedPath = clean;
        break;
      }
    }

    if (!resolvedPath) {
      console.error("Fichier facture introuvable. candidates=", candidates);
      return json(
        {
          error:
            "Fichier de facture introuvable. Merci de demander une régénération (admin) ou de contacter le support.",
          candidates,
        },
        404
      );
    }

    console.log("Création d'une URL signée pour:", resolvedPath);

    // Créer une URL signée (valide 60 secondes)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("factures")
      .createSignedUrl(resolvedPath, 60);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error("Erreur création URL signée:", signedUrlError);
      return json({ error: "Impossible de générer l'URL de téléchargement" }, 500);
    }

    return json({ signedUrl: signedUrlData.signedUrl, filename: `facture_${facture.numero}.pdf` });
  } catch (error: any) {
    console.error("Erreur:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
