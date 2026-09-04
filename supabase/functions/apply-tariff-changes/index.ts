import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "contact@discountcartegrise.fr";

// Réponse JSON + CORS.
function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// --- Helpers de notification RECOPIÉS de webhook-sogecommerce ---------------
// (les edge functions ne partagent pas leur code → recopie, comme le pattern existant)

// Email via l'edge function send-email (type custom_notification) — NON bloquant.
async function sendEmail(type: string, to: string, data: Record<string, unknown>) {
  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const response = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceRoleKey}`,
          "apikey": serviceRoleKey,
        },
        body: JSON.stringify({ type, to, data }),
      },
    );
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Email send failed:", errorText);
    } else {
      console.log("✅ Email sent successfully to", to);
    }
  } catch (error) {
    console.error("❌ Error sending email:", error);
  }
}

// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      console.error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant");
      return json(500, { error: "Configuration serveur incomplète" });
    }
    // Appel réservé au cron (et à l'admin) : le déclencheur envoie la clé de
    // service en Authorization. Sans ce contrôle, l'endpoint est public.
    const porteur = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (porteur !== serviceKey) {
      console.warn("⛔ apply-tariff-changes : appel non autorisé");
      return json(401, { error: "Non autorisé" });
    }

    // Client service_role : lit/écrit malgré la RLS.
    const supabase = createClient(supabaseUrl, serviceKey);

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // 2) Changements dus et non encore appliqués.
    const { data: changes, error: readError } = await supabase
      .from("tariff_changes")
      .select("*")
      .lte("date_effet", today)
      .eq("applique", false);

    if (readError) throw readError;

    // 3) Rien à faire → 200 silencieux, aucune notification.
    if (!changes || changes.length === 0) {
      console.log("Aucun changement de tarif à appliquer aujourd'hui.");
      return json(200, { message: "aucun changement a appliquer", appliques: [], erreurs: [] });
    }

    const appliques: Array<{ id: string; region: string; nouveau_tarif: number; departements: number }> = [];
    const erreurs: Array<{ id: string; region: string; raison: string }> = [];

    // 4) Traiter un par un (chacun marqué appliqué SEULEMENT après son UPDATE réussi).
    for (const change of changes) {
      try {
        const { data: updated, error: updErr } = await supabase
          .from("department_tariffs")
          .update({ tarif: change.nouveau_tarif, updated_at: new Date().toISOString() })
          .eq("region", change.region)
          .select("code");

        if (updErr) throw updErr;

        const nb = updated?.length ?? 0;

        // Région introuvable / mal orthographiée → ne PAS marquer appliqué, on alerte.
        if (nb === 0) {
          console.error(`Région introuvable: "${change.region}" (changement ${change.id})`);
          erreurs.push({ id: change.id, region: change.region, raison: "region introuvable, non appliquee" });
          continue;
        }

        // Marquer le changement comme appliqué (idempotence).
        const { error: markErr } = await supabase
          .from("tariff_changes")
          .update({ applique: true, applied_at: new Date().toISOString() })
          .eq("id", change.id);

        if (markErr) throw markErr;

        appliques.push({
          id: change.id,
          region: change.region,
          nouveau_tarif: Number(change.nouveau_tarif),
          departements: nb,
        });
        console.log(`✅ ${change.region} → ${change.nouveau_tarif} €/CV (${nb} départements)`);
      } catch (e) {
        console.error("Erreur traitement changement", change.id, e);
        erreurs.push({
          id: change.id,
          region: change.region,
          raison: `erreur: ${e instanceof Error ? e.message : String(e)}`,
        });
      }
    }

    // 5) Notification EMAIL (uniquement s'il s'est passé quelque chose), NON bloquante.
    //    Un seul email : section "appliqués" et/ou section "erreurs" selon les cas.
    //    Rien à appliquer → aucun email (silencieux).
    if (appliques.length > 0 || erreurs.length > 0) {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const sections: string[] = [];

      if (appliques.length > 0) {
        const lignes = appliques
          .map((a) => `- Region ${a.region} -> ${a.nouveau_tarif} euros/CV (${a.departements} departements)`)
          .join("\n");
        sections.push(`Changements appliques le ${today} :\n${lignes}`);
      }
      if (erreurs.length > 0) {
        const lignes = erreurs
          .map((e) => `- Region "${e.region}" introuvable : NON appliquee`)
          .join("\n");
        sections.push(`ATTENTION - erreurs (aucune modification pour ces regions) :\n${lignes}`);
      }

      // Le sujet signale l'erreur en priorité (cas mixte inclus).
      const subject = erreurs.length > 0
        ? "ATTENTION Veilleur tarifs - erreur"
        : "Veilleur tarifs - changement applique";
      const message = sections.join("\n\n");

      try {
        await sendEmail("custom_notification", ADMIN_EMAIL, { subject, message });
      } catch (e) {
        console.error("Notif email échouée (non bloquant):", e);
      }
    }

    // 6) Résumé.
    return json(200, { appliques, erreurs });
  } catch (error) {
    console.error("Erreur apply-tariff-changes:", error);
    return json(500, { error: error instanceof Error ? error.message : "Erreur inconnue" });
  }
});
