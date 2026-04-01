import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_EXPORT_SIZE = 100 * 1024 * 1024; // 100 MB

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(null, { status: 405, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non authentifie" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userSupabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();

    if (!user || authError) {
      return new Response(JSON.stringify({ error: "Non authentifie" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get garage
    const { data: garage } = await supabase
      .from("garages")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!garage) {
      return new Response(JSON.stringify({ error: "Garage non trouve" }), {
        status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check active subscription
    const { data: sub } = await supabase
      .from("coffre_subscriptions")
      .select("status")
      .eq("garage_id", garage.id)
      .in("status", ["active", "trialing"])
      .single();

    if (!sub) {
      return new Response(JSON.stringify({ error: "Abonnement coffre-fort requis" }), {
        status: 403, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { ids, all, year } = await req.json();

    // Build query for documents
    let query = supabase
      .from("coffre_documents")
      .select("id, file_path, file_name, file_size, category, document_date")
      .eq("garage_id", garage.id);

    if (ids && Array.isArray(ids) && ids.length > 0) {
      query = query.in("id", ids);
    } else if (year) {
      query = query
        .gte("document_date", `${year}-01-01`)
        .lte("document_date", `${year}-12-31`);
    }

    const { data: documents, error: docsError } = await query;

    if (docsError || !documents || documents.length === 0) {
      return new Response(JSON.stringify({ error: "Aucun document a exporter" }), {
        status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Pre-flight size check
    const totalSize = documents.reduce((sum, doc) => sum + (doc.file_size || 0), 0);
    if (totalSize > MAX_EXPORT_SIZE) {
      return new Response(JSON.stringify({
        error: "Veuillez selectionner moins de documents. La taille totale depasse 100 Mo.",
      }), {
        status: 413, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Build ZIP
    const zip = new JSZip();

    for (const doc of documents) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("coffre-fort-documents")
        .download(doc.file_path);

      if (downloadError || !fileData) {
        console.error(`Failed to download ${doc.file_path}:`, downloadError);
        continue;
      }

      const arrayBuffer = await fileData.arrayBuffer();
      const folderName = doc.category || "autres";
      zip.file(`${folderName}/${doc.id}_${doc.file_name}`, arrayBuffer);
    }

    const zipBlob = await zip.generateAsync({ type: "arraybuffer" });

    return new Response(zipBlob, {
      status: 200,
      headers: {
        ...corsHeaders,
        // Must use application/octet-stream — supabase-js parses application/zip as text
        // which corrupts the binary data and makes the ZIP unreadable
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="coffre-fort-export.zip"`,
      },
    });
  } catch (error: any) {
    console.error("Error in export-coffre-documents:", error);
    return new Response(JSON.stringify({ error: "Erreur interne" }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
