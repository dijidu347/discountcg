// Le solde de crédits qui sert à identifier les plaques.
//
// Le 1er octobre 2026, l'identification s'est arrêtée sur tout le site parce
// qu'un fournisseur avait perdu son accès. On a changé de fournisseur, mais il
// reste un scénario qui produirait exactement la même panne, en plus bête :
// tomber à zéro crédit sans l'avoir vu venir.
//
// Cette fonction relève le solde chez Auto Ways une fois par jour, le garde en
// base pour qu'il soit affichable, et prévient par e-mail quand il descend. Un
// seuil ne prévient qu'une fois : repasser dessous après un rechargement
// réarme l'alerte, rester dessous ne la répète pas.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Neuf jours de consommation pour le premier seuil, deux pour le second : de
// quoi commander sans hâte, puis de quoi comprendre que ça presse.
const SEUILS = [200, 50];

// Le solde se présente différemment selon les comptes : parfois à la racine,
// parfois sous « data », sous des noms variés. On cherche le premier nombre
// qui ressemble à un solde plutôt que d'imposer une forme.
function soldeLu(corps: unknown): number | null {
  const candidats = ["credits", "credit", "solde", "balance", "total_credits", "remaining", "available"];
  const visite = (valeur: unknown, profondeur = 0): number | null => {
    if (profondeur > 3 || !valeur || typeof valeur !== "object") return null;
    const objet = valeur as Record<string, unknown>;
    for (const cle of Object.keys(objet)) {
      const v = objet[cle];
      if (candidats.includes(cle.toLowerCase())) {
        const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.-]/g, ""));
        if (Number.isFinite(n)) return n;
      }
    }
    for (const v of Object.values(objet)) {
      const trouve = visite(v, profondeur + 1);
      if (trouve !== null) return trouve;
    }
    return null;
  };
  return visite(corps);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if ((req.headers.get("Authorization") ?? "") !== `Bearer ${serviceKey}`) {
    return json({ error: "Non autorisé" }, 401);
  }

  const jeton = Deno.env.get("AUTOWAYS_TOKEN");
  if (!jeton) return json({ enSommeil: true, motif: "AUTOWAYS_TOKEN absente" });

  const supabase = createClient(supabaseUrl, serviceKey);

  let corps: unknown = null;
  try {
    const reponse = await fetch(
      `https://app.auto-ways.net/api/my-account/credits?token=${encodeURIComponent(jeton)}`,
      { signal: AbortSignal.timeout(12_000) },
    );
    const texte = await reponse.text();
    try { corps = JSON.parse(texte); } catch { corps = null; }
    if (!reponse.ok) {
      console.error(`solde-plaques: ${reponse.status} ${texte.slice(0, 200)}`);
      return json({ error: `Fournisseur injoignable (${reponse.status})` }, 200);
    }
  } catch (e) {
    console.error("solde-plaques: réseau", e instanceof Error ? e.message : e);
    return json({ error: "Fournisseur injoignable" }, 200);
  }

  const solde = soldeLu(corps);
  if (solde === null) {
    console.error("solde-plaques: solde illisible", JSON.stringify(corps).slice(0, 300));
    return json({ error: "Solde illisible dans la réponse" }, 200);
  }

  const { data: precedent } = await supabase
    .from("solde_plaques")
    .select("solde, seuil_alerte_le")
    .eq("id", 1)
    .maybeSingle();

  // Le seuil franchi, s'il y en a un : le plus bas atteint.
  const franchi = SEUILS.find((seuil) => solde <= seuil) ?? null;
  const dejaPrevenuPour = (precedent?.seuil_alerte_le as number | null) ?? null;
  const aPrevenir = franchi !== null && franchi !== dejaPrevenuPour;

  await supabase.from("solde_plaques").upsert({
    id: 1,
    solde,
    releve_le: new Date().toISOString(),
    // Un rechargement remonte au-dessus des seuils et réarme l'alerte.
    seuil_alerte_le: franchi,
  });

  if (aPrevenir) {
    const jours = Math.floor(solde / 23);
    await supabase.functions.invoke("send-email", {
      body: {
        type: "solde_plaques_bas",
        to: Deno.env.get("EMAIL_ADMIN") ?? "contact@discountcartegrise.fr",
        data: {
          solde,
          seuil: franchi,
          jours,
          lien: "https://auto-ways.net/product/credit/",
        },
      },
    });
  }

  return json({ solde, seuil_franchi: franchi, alerte_envoyee: aPrevenir });
});
