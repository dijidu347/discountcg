// Relance des dossiers en sommeil : « il nous manque vos pièces ».
//
// Appelée chaque matin par pg_cron (clé serveur). La base désigne les dossiers
// réglés où c'est au client d'agir (aucune pièce, ou une pièce refusée pas
// remplacée) et sans nouvelles depuis 30 jours ; un dernier rappel part à 60.
// Seuls les dossiers qui s'endorment après la mise en service sont concernés.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const MISE_EN_SERVICE = "2026-09-21T14:00:00Z";
const LOT_MAX = 50;
const SITE = "https://discountcartegrise.fr";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type Dossier = {
  source: "pro" | "particulier";
  dossier_id: string;
  email: string | null;
  nom: string | null;
  reference: string | null;
  demarche: string | null;
  immatriculation: string | null;
  pieces: { piece?: string; motif?: string }[];
  numero_relance: number;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if ((req.headers.get("Authorization") ?? "") !== `Bearer ${serviceKey}`) {
    return json({ error: "Non autorisé" }, 401);
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data, error } = await supabase.rpc("dossiers_sommeil_a_relancer", { p_mise_en_service: MISE_EN_SERVICE });
  if (error) {
    console.error("sommeil: lecture des dossiers", error);
    return json({ error: error.message }, 500);
  }

  let envoyees = 0;
  const ignorees: Record<string, number> = {};
  const ignorer = (raison: string) => (ignorees[raison] = (ignorees[raison] || 0) + 1);

  for (const d of (data || []) as Dossier[]) {
    if (envoyees >= LOT_MAX) break;
    const email = String(d.email || "").trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { ignorer("email invalide"); continue; }

    const { count: exclu } = await supabase
      .from("suppressed_emails")
      .select("id", { count: "exact", head: true })
      .ilike("email", email.replace(/[\\%_]/g, (m) => `\\${m}`));
    if ((exclu ?? 0) > 0) { ignorer("email exclu"); continue; }

    const pro = d.source === "pro";
    if (!pro && !d.reference) { ignorer("sans numéro de suivi"); continue; }

    // Un code technique (qf_justif_siege…) ne parle pas au client : le motif suffit.
    const pieces = (d.pieces || []).map((p) => ({
      piece: /^[a-z0-9_]+$/.test(String(p.piece || "")) ? "Pièce demandée" : p.piece,
      motif: p.motif || "",
    }));

    const reponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
      body: JSON.stringify({
        type: "dossier_pieces_manquantes",
        to: email,
        data: {
          audience: pro ? "pro" : "particulier",
          nom: d.nom || "",
          reference: d.reference || "",
          demarche_label: d.demarche || "",
          immatriculation: d.immatriculation || "",
          pieces,
          numero_relance: d.numero_relance,
          lien: pro ? `${SITE}/demarche/${d.dossier_id}` : `${SITE}/suivi/${encodeURIComponent(d.reference || "")}`,
        },
      }),
    });
    if (!reponse.ok) {
      console.error("sommeil: envoi refusé", d.dossier_id, await reponse.text());
      ignorer("envoi refusé");
      continue;
    }

    await supabase
      .from(pro ? "demarches" : "guest_orders")
      .update({ relances_sommeil: d.numero_relance, derniere_relance_sommeil_at: new Date().toISOString() })
      .eq("id", d.dossier_id);
    envoyees++;
  }

  console.log("sommeil: envoyées", envoyees, "ignorées", ignorees);
  return json({ envoyees, ignorees });
});
