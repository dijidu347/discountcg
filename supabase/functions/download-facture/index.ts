// Signature d'une URL de telechargement de facture.
//
// Cette fonction signait auparavant N'IMPORTE QUEL chemin, sans verifier ni
// l'existence de la facture ni les droits du demandeur. Les factures etant
// numerotees en sequence (facture_2026-00001.pdf, 00002, ...), il suffisait
// d'incrementer pour aspirer la comptabilite entiere. Elle exige desormais que
// la facture existe ET que le demandeur y ait droit.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// "abc-uuid/2026-00001.pdf" ou "facture_2026-00001.pdf" -> "2026-00001"
function numeroDepuisChemin(chemin: string): string {
  const base = chemin.split("/").pop() ?? chemin;
  return base.replace(/\.[a-z0-9]+$/i, "").replace(/^facture_/i, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const raw = await req.text();
    let payload: Record<string, unknown> = {};
    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch {
      payload = {};
    }

    const corps = (payload?.body ?? payload) as Record<string, unknown>;
    const path = corps?.path;
    // Fourni par le suivi de commande invite : le porteur du numero de suivi a
    // droit a la facture de SA commande, et a elle seule.
    const trackingNumber = corps?.tracking_number;

    if (!path || typeof path !== "string") {
      return json(400, { error: "path requis" });
    }
    // Un chemin ne remonte jamais l'arborescence.
    if (path.includes("..")) {
      return json(400, { error: "chemin invalide" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // ─── La facture doit exister ───────────────────────────────────────────
    // Deux recherches : l'URL enregistree, puis le numero deduit du nom. La
    // seconde rattrape les 648 fichiers dont le pdf_url a change lors d'une
    // regeneration, et qui resteraient sinon intelechargeables.
    let facture: { id: string; garage_id: string | null; guest_order_id: string | null } | null = null;

    const { data: parUrl } = await supabase
      .from("factures")
      .select("id, garage_id, guest_order_id")
      .like("pdf_url", `%${path}`)
      .maybeSingle();
    facture = parUrl ?? null;

    if (!facture) {
      const { data: parNumero } = await supabase
        .from("factures")
        .select("id, garage_id, guest_order_id")
        .eq("numero", numeroDepuisChemin(path))
        .maybeSingle();
      facture = parNumero ?? null;
    }

    if (!facture) {
      console.warn("⛔ download-facture : aucune facture pour", path);
      return json(404, { error: "Not found" });
    }

    // ─── Le demandeur doit y avoir droit ───────────────────────────────────
    let autorise = false;

    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? serviceKey;
      const clientUtilisateur = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await clientUtilisateur.auth.getUser();

      if (user) {
        const { data: role } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (role) autorise = true;

        // Un garage n'accede qu'a ses propres factures : sans cette egalite,
        // n'importe quel garage connecte lisait celles des autres.
        if (!autorise && facture.garage_id) {
          const { data: garage } = await supabase
            .from("garages")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();
          if (garage && garage.id === facture.garage_id) autorise = true;
        }
      }
    }

    if (!autorise && facture.guest_order_id && typeof trackingNumber === "string" && trackingNumber.trim()) {
      const { data: commande } = await supabase
        .from("guest_orders")
        .select("id")
        .eq("tracking_number", trackingNumber.trim())
        .maybeSingle();
      if (commande && commande.id === facture.guest_order_id) autorise = true;
    }

    if (!autorise) {
      console.warn("⛔ download-facture : acces refuse sur", path);
      return json(403, { error: "Accès non autorisé à cette facture" });
    }

    const { data, error } = await supabase.storage
      .from("factures")
      .createSignedUrl(path, 60 * 5);

    if (error || !data?.signedUrl) {
      return json(404, { error: "Not found" });
    }

    return json(200, { url: data.signedUrl });
  } catch (error) {
    console.error("❌ download-facture:", error);
    return json(500, { error: "Erreur interne" });
  }
});
