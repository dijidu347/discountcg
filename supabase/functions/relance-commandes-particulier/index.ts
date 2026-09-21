// Relances des commandes particulier non payées.
//
// Appelée toutes les heures par pg_cron (action « relancer », clé serveur) :
// au plus deux rappels par commande, à J+1 puis à J+3, pour la dernière
// commande non payée de chaque email, créée après la mise en service.
//
// Appelée aussi depuis le lien « ne plus recevoir de rappel » du mail
// (?stop=<id de commande>) : la commande ne sera plus relancée.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Les commandes antérieures ne sont jamais relancées : pas de mail surprise à
// des personnes venues il y a des semaines.
const MISE_EN_SERVICE = "2026-09-21T00:00:00Z";
const HEURE = 3600_000;
const LOT_MAX = 50;
const SITE = "https://discountcartegrise.fr";

// Démarches dont la reprise passe par la page carte grise (taxe calculée).
const TYPES_AVEC_TAXE = ["CG", "IMMAT_DEFINITIVE"];

const LIBELLES: Record<string, string> = {
  CG: "carte grise",
  IMMAT_DEFINITIVE: "immatriculation définitive",
  DC: "déclaration de cession",
  DUPLICATA: "demande de duplicata",
  CHGT_ADRESSE: "changement d'adresse",
  CPI_WW: "immatriculation WW",
  QUITUS_FISCAL: "demande de quitus fiscal",
  FIV: "demande de FIV",
  SUCCESSION: "carte grise suite à une succession",
  CG_NEUF: "immatriculation de véhicule neuf",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const page = (texte: string) =>
  new Response(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DiscountCarteGrise</title></head>
<body style="font-family:Arial,sans-serif;max-width:520px;margin:60px auto;padding:0 20px;color:#111">
<p style="font-size:18px">${texte}</p><p><a href="${SITE}">Retour sur DiscountCarteGrise</a></p></body></html>`,
    { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } },
  );

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, serviceKey);

  // --- Lien « ne plus recevoir de rappel » -----------------------------------
  const stop = new URL(req.url).searchParams.get("stop");
  if (stop) {
    if (!/^[0-9a-f-]{36}$/i.test(stop)) return page("Ce lien n'est pas valide.");
    await supabase.from("guest_orders").update({ relances_stoppees: true }).eq("id", stop);
    return page("C'est noté : vous ne recevrez plus de rappel pour cette demande.");
  }

  // --- Envoi des relances (pg_cron, clé serveur uniquement) -------------------
  const auth = req.headers.get("Authorization") ?? "";
  if (auth !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const maintenant = Date.now();
  const { data: candidates, error } = await supabase
    .from("guest_orders")
    .select("id, email, prenom, demarche_type, immatriculation, montant_ttc, departement, date_mec, puiss_fisc, created_at, relances_envoyees, derniere_relance_at")
    .eq("paye", false)
    .eq("relances_stoppees", false)
    .lt("relances_envoyees", 2)
    .not("email", "is", null)
    .gte("created_at", MISE_EN_SERVICE)
    .gte("created_at", new Date(maintenant - 8 * 24 * HEURE).toISOString())
    .lte("created_at", new Date(maintenant - 24 * HEURE).toISOString())
    .order("created_at", { ascending: true })
    .limit(500);

  if (error) {
    console.error("relance: lecture des commandes", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: types } = await supabase.from("guest_demarche_types").select("code, titre, actif");
  const typeParCode = new Map((types || []).map((t: { code: string; titre: string; actif: boolean }) => [t.code, t]));

  let envoyees = 0;
  const ignorees: Record<string, number> = {};
  const ignorer = (raison: string) => (ignorees[raison] = (ignorees[raison] || 0) + 1);

  for (const c of candidates || []) {
    if (envoyees >= LOT_MAX) break;
    const email = String(c.email || "").trim();
    // ilike sert de comparaison insensible à la casse : on neutralise ses jokers.
    const emailExact = email.replace(/[\\%_]/g, (m) => `\\${m}`);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { ignorer("email invalide"); continue; }

    // Échéance : 1er rappel à J+1, 2e à J+3 (et au moins 36 h après le 1er).
    const age = maintenant - new Date(c.created_at).getTime();
    const depuisRelance = c.derniere_relance_at ? maintenant - new Date(c.derniere_relance_at).getTime() : Infinity;
    const due = (c.relances_envoyees === 0 && age >= 24 * HEURE) ||
      (c.relances_envoyees === 1 && age >= 72 * HEURE && depuisRelance >= 36 * HEURE);
    if (!due) { ignorer("pas encore l'heure"); continue; }

    const type = typeParCode.get(c.demarche_type);
    if (!type || type.actif === false) { ignorer("démarche retirée"); continue; }

    // Même email : une commande payée ou plus récente règle la question.
    const { count: autres } = await supabase
      .from("guest_orders")
      .select("id", { count: "exact", head: true })
      .ilike("email", emailExact)
      .neq("id", c.id)
      .or(`paye.eq.true,created_at.gt."${c.created_at}"`);
    if ((autres ?? 0) > 0) { ignorer("commande plus récente ou payée"); continue; }

    const { count: exclu } = await supabase
      .from("suppressed_emails")
      .select("id", { count: "exact", head: true })
      .ilike("email", emailExact);
    if ((exclu ?? 0) > 0) { ignorer("email exclu"); continue; }

    const plaque = encodeURIComponent(String(c.immatriculation || "").replace(/[-\s]/g, ""));
    let lienReprise: string;
    if (TYPES_AVEC_TAXE.includes(c.demarche_type)) {
      // La page carte grise a besoin du département et du véhicule enregistrés.
      if (!c.departement || !c.date_mec || !c.puiss_fisc) { ignorer("données carte grise incomplètes"); continue; }
      lienReprise = `${SITE}/resultat-carte-grise?orderId=${c.id}&departement=${encodeURIComponent(c.departement)}&plaque=${plaque}`;
    } else {
      lienReprise = `${SITE}/demarche-simple?orderId=${c.id}&type=${encodeURIComponent(c.demarche_type)}&plaque=${plaque}`;
    }

    const numero = c.relances_envoyees + 1;
    const montant = Number(c.montant_ttc) > 0 ? Number(c.montant_ttc).toFixed(2).replace(".", ",") : null;

    const reponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
      body: JSON.stringify({
        type: "guest_order_reminder",
        to: email,
        data: {
          prenom: c.prenom || "",
          demarche_label: LIBELLES[c.demarche_type] || type.titre,
          immatriculation: c.immatriculation || "",
          montant,
          lien_reprise: lienReprise,
          lien_stop: `${supabaseUrl}/functions/v1/relance-commandes-particulier?stop=${c.id}`,
          numero_relance: numero,
        },
      }),
    });

    if (!reponse.ok) {
      console.error("relance: envoi refusé", c.id, await reponse.text());
      ignorer("envoi refusé");
      continue;
    }

    await supabase
      .from("guest_orders")
      .update({ relances_envoyees: numero, derniere_relance_at: new Date().toISOString() })
      .eq("id", c.id);
    envoyees++;
  }

  console.log("relance: envoyées", envoyees, "ignorées", ignorees);
  return new Response(JSON.stringify({ envoyees, ignorees }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
