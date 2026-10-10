// Retirer du stockage les fichiers que plus rien ne référence.
//
// Un fichier « orphelin » est présent sur le disque mais aucune ligne de la
// base ne donne son adresse : ni le garage, ni l'administration, ni le
// contrôle automatique ne peuvent l'atteindre. L'écran lit la base, pas le
// disque.
//
// Ils naissent de deux gestes ordinaires : une démarche supprimée, dont les
// lignes partent en cascade mais pas les fichiers ; et un document remplacé,
// dont on efface la ligne sans que personne ne pense au disque.
//
// DEUX FAMILLES SEULEMENT SONT RETIRÉES, et ce découpage est le cœur de cette
// fonction :
//
//   1. Le dossier parent n'existe plus — ni démarche, ni garage, ni commande.
//      Rien ne pourra jamais les rattacher à quoi que ce soit.
//
//   2. Une pièce de vérification dont le garage possède, pour le même type,
//      une pièce APPROUVÉE plus récente. L'ancienne a été remplacée et
//      validée : c'est la nouvelle qui fait foi.
//
// Tout le reste est conservé, en particulier les fichiers rattachés à une
// démarche qui existe encore. Leur ligne a été effacée, mais la démarche est
// vivante : on ne peut pas affirmer que personne ne les cherchera.
//
// La détection repose sur les colonnes qui STOCKENT une adresse. Si du code
// reconstruisait un chemin par convention sans l'enregistrer, le fichier
// paraîtrait orphelin tout en étant utilisé — d'où le mode `apercu`, qui ne
// supprime rien et rend la liste.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const BUCKET = "demarche-documents";
// Supabase accepte une suppression par lots ; mille chemins par appel reste
// en deçà de ce que l'API tolère, et laisse la fonction rendre la main.
const TAILLE_LOT = 500;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if ((req.headers.get("Authorization") ?? "") !== `Bearer ${serviceKey}`) {
    return json({ error: "Non autorisé" }, 401);
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const corps = await req.json().catch(() => ({}));
  // Rien n'est supprimé sans le dire explicitement. Le défaut est l'aperçu.
  const supprimer = corps?.supprimer === true;
  const plafond = Number.isFinite(Number(corps?.plafond)) ? Number(corps.plafond) : null;

  const { data: chemins, error } = await supabase.rpc("fichiers_orphelins_a_retirer");
  if (error) return json({ error: error.message }, 500);

  const liste: string[] = (chemins ?? []).map((l: { chemin: string }) => l.chemin);
  const cible = plafond ? liste.slice(0, plafond) : liste;

  if (!supprimer) {
    return json({
      mode: "apercu",
      orphelins: liste.length,
      echantillon: cible.slice(0, 25),
    });
  }

  let retires = 0;
  const echecs: string[] = [];
  for (let i = 0; i < cible.length; i += TAILLE_LOT) {
    const lot = cible.slice(i, i + TAILLE_LOT);
    const { error: err } = await supabase.storage.from(BUCKET).remove(lot);
    if (err) {
      echecs.push(`${lot[0]}… : ${err.message}`);
      continue;
    }
    retires += lot.length;
  }

  return json({ mode: "suppression", demandes: cible.length, retires, echecs });
});
