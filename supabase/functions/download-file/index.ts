// Telechargement d'un document de commande invitee.
//
// Seul appelant : le bouton de telechargement de la page de suivi, qui
// transmet toujours le numero de suivi.
//
// Avant correction, ce serveur ne verifiait les droits QUE si un numero de
// suivi etait fourni. Sans numero, il servait n'importe quel fichier de
// n'importe quel espace de stockage, l'appelant choisissant le bucket : les
// factures et les pieces d'identite etaient lisibles par tous, stockage prive
// ou non. Et avec un numero, il verifiait seulement que la commande possedait
// UN document, pas que le fichier demande lui appartenait.
//
// Il exige desormais le numero de suivi, se limite aux documents invites, et
// verifie que le fichier appartient a la commande.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-tracking-number",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Seul espace servi ici. Les factures passent par download-facture, les
// documents des garages par get-signed-url.
const BUCKET = "guest-order-documents";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const bucket = url.searchParams.get("bucket");
    const cheminBrut = url.searchParams.get("path");
    const trackingNumber = (url.searchParams.get("tracking") || req.headers.get("x-tracking-number") || "").trim();

    if (!bucket || !cheminBrut) return json(400, { error: "Missing bucket or path" });
    if (bucket !== BUCKET) return json(403, { error: "Espace de stockage non autorise" });
    if (!trackingNumber) return json(401, { error: "Numero de suivi requis" });

    const path = decodeURIComponent(cheminBrut);
    if (path.includes("..")) return json(400, { error: "Chemin invalide" });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: commande } = await supabase
      .from("guest_orders")
      .select("id")
      .eq("tracking_number", trackingNumber)
      .maybeSingle();

    if (!commande) {
      console.warn("⛔ download-file : numero de suivi inconnu");
      return json(401, { error: "Unauthorized" });
    }

    // Appartenance : le fichier est range sous l'identifiant de la commande, ou
    // il est reference par un document de cette commande (client ou envoye par
    // l'administration). 94 fichiers anciens ne suivent pas la premiere regle.
    let autorise = path.split("/")[0] === commande.id;
    if (!autorise) {
      for (const forme of [...new Set([path, encodeURI(path)])]) {
        const motif = `%${forme}%`;
        const { data: docClient } = await supabase
          .from("guest_order_documents")
          .select("id")
          .eq("order_id", commande.id)
          .ilike("url", motif)
          .limit(1);
        const { data: docAdmin } = await supabase
          .from("guest_order_admin_documents")
          .select("id")
          .eq("order_id", commande.id)
          .ilike("url", motif)
          .limit(1);
        if (docClient?.length || docAdmin?.length) {
          autorise = true;
          break;
        }
      }
    }

    if (!autorise) {
      console.warn("⛔ download-file : document hors commande demande");
      return json(403, { error: "Accès non autorisé à ce document" });
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(path);

    if (downloadError || !fileData) {
      console.error("❌ Download error:", downloadError);
      return json(404, { error: "File not found" });
    }

    const filename = path.split("/").pop() || "document";
    const ext = filename.split(".").pop()?.toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === "pdf") contentType = "application/pdf";
    else if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg";
    else if (ext === "png") contentType = "image/png";
    else if (ext === "webp") contentType = "image/webp";

    return new Response(fileData, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error) {
    console.error("❌ Error in download-file:", error);
    return json(500, { error: "Erreur interne" });
  }
});
