// Relance des démarches pro abandonnées avant paiement : « une question ? »
//
// Appelée chaque matin par pg_cron (clé serveur). La base désigne les
// démarches commencées par un garage — immatriculation saisie ou pièce
// déposée — restées en saisie et impayées depuis deux jours, puis sept.
// Jamais plus de deux rappels, jamais au-delà de trente jours, et jamais une
// démarche antérieure à la mise en service : voir la migration pour le détail
// des mesures qui ont fixé ces seuils.
//
// Le ton est celui d'un service, pas d'une relance commerciale : on demande
// s'il y a une difficulté, on ne réclame pas un paiement.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Rien d'antérieur : les 1 772 démarches déjà en sommeil au moment de la mise
// en service ne reçoivent aucun mail.
const MISE_EN_SERVICE = "2026-10-18T12:00:00Z";
const LOT_MAX = 50;
const SITE = "https://discountcartegrise.fr";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type Dossier = {
  dossier_id: string;
  email: string | null;
  nom: string | null;
  reference: string | null;
  demarche: string | null;
  immatriculation: string | null;
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

  const { data, error } = await supabase.rpc("demarches_abandonnees_a_relancer", {
    p_mise_en_service: MISE_EN_SERVICE,
  });
  if (error) {
    console.error("abandon: lecture des démarches", error);
    return json({ error: error.message }, 500);
  }

  let envoyees = 0;
  const ignorees: Record<string, number> = {};
  const ignorer = (raison: string) => (ignorees[raison] = (ignorees[raison] || 0) + 1);

  for (const d of (data || []) as Dossier[]) {
    if (envoyees >= LOT_MAX) break;

    const email = String(d.email || "").trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { ignorer("email invalide"); continue; }

    // Une adresse qui s'est désinscrite ne reçoit plus rien, quel que soit le motif.
    const { count: exclu } = await supabase
      .from("suppressed_emails")
      .select("id", { count: "exact", head: true })
      .ilike("email", email.replace(/[\\%_]/g, (m) => `\\${m}`));
    if ((exclu ?? 0) > 0) { ignorer("email exclu"); continue; }

    const reponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
      body: JSON.stringify({
        type: "demarche_abandonnee",
        to: email,
        data: {
          nom: d.nom || "",
          reference: d.reference || "",
          demarche_label: d.demarche || "",
          immatriculation: d.immatriculation || "",
          numero_relance: d.numero_relance,
          demarche_id: d.dossier_id,
          lien: `${SITE}/demarche/${d.dossier_id}`,
        },
      }),
    });
    if (!reponse.ok) {
      console.error("abandon: envoi refusé", d.dossier_id, await reponse.text());
      ignorer("envoi refusé");
      continue;
    }

    // Marqué APRÈS l'envoi : si le mail échoue, la démarche reste à relancer.
    // Marqué avant, un incident chez Resend consommerait les deux rappels en
    // silence et le garage n'entendrait jamais parler de nous.
    const { error: majErr } = await supabase
      .from("demarches")
      .update({
        relances_abandon: d.numero_relance,
        derniere_relance_abandon_at: new Date().toISOString(),
      })
      .eq("id", d.dossier_id);
    if (majErr) console.error("abandon: compteur non mis à jour", d.dossier_id, majErr);

    envoyees++;
  }

  console.log("abandon: relances envoyées", { envoyees, ignorees, candidats: (data || []).length });
  return json({ envoyees, ignorees, candidats: (data || []).length });
});
