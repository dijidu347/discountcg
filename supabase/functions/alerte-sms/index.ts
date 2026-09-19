// Alertes SMS appelées depuis le site.
//
// - { test: true } : SMS de test, réservé aux administrateurs. Renvoie aussi le
//   compte SMS Partner rattaché à la clé, pour vérifier qu'on regarde le bon.
// - { demarcheId } : dossier prioritaire payé sans passer par la banque (jetons,
//   démarche offerte). Le webhook de paiement ne voit pas ces paiements : c'est
//   le garage qui appelle cette fonction juste après. Un seul SMS par dossier.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { compteSmsPartner, envoyerSmsAlerte } from "../_shared/smsAlerte.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Authentification requise" });
    const clientUtilisateur = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await clientUtilisateur.auth.getUser();
    if (!user) return json(401, { error: "Session invalide" });

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const estAdmin = (roles || []).some((r: { role: string }) => r.role === "admin");

    const body = await req.json().catch(() => ({}));

    // --- SMS de test --------------------------------------------------------
    if (body?.test === true) {
      if (!estAdmin) return json(403, { error: "Réservé aux administrateurs" });
      const heure = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
      const resultat = await envoyerSmsAlerte(supabase, {
        contexte: "test",
        reference: null,
        message: `Test DiscountCarteGrise du ${heure} : les alertes SMS des dossiers prioritaires fonctionnent.`,
      });
      return json(200, { ...resultat, compte: await compteSmsPartner() });
    }

    // --- Dossier prioritaire payé en jetons ou offert -----------------------
    const demarcheId = body?.demarcheId;
    if (!demarcheId) return json(400, { error: "demarcheId requis" });

    const { data: d } = await supabase
      .from("demarches")
      .select("numero_demarche, type, express, paye, paid_with_tokens, is_free_token, is_draft, garages(user_id)")
      .eq("id", demarcheId)
      .maybeSingle();
    if (!d) return json(404, { error: "Démarche introuvable" });
    // deno-lint-ignore no-explicit-any
    if ((d as any).garages?.user_id !== user.id && !estAdmin) return json(403, { error: "Non autorisé" });

    // Paiement partagé (split) : le SMS part quand le client a payé sa part
    // (webhook, contexte paiement_client), pas à la part du garage.
    const reglee = d.paye || (d.is_free_token && !d.is_draft);
    if (!d.express || !reglee) return json(200, { envoye: false, raison: "pas un dossier prioritaire réglé" });

    const { count } = await supabase
      .from("sms_envois")
      .select("id", { count: "exact", head: true })
      .eq("reference", d.numero_demarche)
      .eq("envoye", true);
    if ((count ?? 0) > 0) return json(200, { envoye: false, raison: "déjà envoyé" });

    const resultat = await envoyerSmsAlerte(supabase, {
      contexte: "jetons",
      reference: d.numero_demarche,
      message: `Nouveau dossier PRIORITAIRE paye: ${d.numero_demarche} (${d.type}). A traiter sous 2h.`,
    });
    return json(200, resultat);
  } catch (e) {
    console.error("alerte-sms:", e);
    return json(500, { error: e instanceof Error ? e.message : String(e) });
  }
});
