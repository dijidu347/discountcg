// Le Kbis d'un garage vérifié périme au bout de six mois.
//
// Le guide SIV exige un Kbis de moins de 6 mois au dossier. Comme il est
// collecté une fois à la vérification du compte, il vieillit sans que rien ne le
// signale. Passée la date, le garage perd sa vérification et doit en redéposer
// un pour la retrouver.
//
// Deux temps à chaque passage : on prévient quinze jours avant, puis on retire
// la vérification le jour venu. Personne ne la perd sans avoir été averti.
//
// Ce qui est retiré est un badge, pas un droit : le garage continue de déposer
// ses démarches normalement.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const JOURS_AVANT_ALERTE = 15;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type Garage = {
  id: string;
  raison_sociale: string | null;
  email: string | null;
  kbis_valide_jusqu_au: string | null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if ((req.headers.get("Authorization") ?? "") !== `Bearer ${serviceKey}`) {
    return json({ error: "Non autorisé" }, 401);
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const corps = await req.json().catch(() => ({}));
  // Sans délai, on retire la vérification dès le jour de l'échéance, sans
  // attendre que l'alerte ait quinze jours. Réservé à une reprise de l'existant,
  // décidée explicitement.
  const sansDelai: boolean = corps?.sans_delai === true;
  // Relancer tout le monde, y compris ceux déjà prévenus et ceux qui ont déjà
  // perdu leur vérification. Sert après une correction : le premier message
  // annonçait une date illisible (« le 2026-06-29 ») et renvoyait vers un
  // espace où le dépôt ne marchait pas.
  const relancerPerimes: boolean = corps?.relancer_perimes === true;

  const aujourdhui = new Date().toISOString().slice(0, 10);
  const dans15Jours = new Date(Date.now() + JOURS_AVANT_ALERTE * 86400_000).toISOString().slice(0, 10);
  const ilYa15Jours = new Date(Date.now() - JOURS_AVANT_ALERTE * 86400_000).toISOString();

  const prevenir = async (garage: Garage, expire: boolean) => {
    const depasse = !expire && !!garage.kbis_valide_jusqu_au && garage.kbis_valide_jusqu_au < aujourdhui;
    await supabase.from("notifications").insert({
      garage_id: garage.id,
      type: expire ? "kbis_expire" : "kbis_bientot_expire",
      message: expire
        ? "Votre extrait Kbis a plus de six mois : votre compte n'est plus vérifié. Déposez un Kbis récent pour retrouver votre vérification."
        : depasse
        ? "Votre extrait Kbis a dépassé six mois. Déposez-en un récent sous quinze jours pour conserver votre vérification."
        : `Votre extrait Kbis arrive à échéance le ${garage.kbis_valide_jusqu_au}. Pensez à en déposer un récent.`,
    });

    if (!garage.email) return;
    await supabase.functions.invoke("send-email", {
      body: {
        type: "kbis_a_renouveler",
        to: garage.email,
        data: {
          nom: garage.raison_sociale ?? "",
          echeance: garage.kbis_valide_jusqu_au ?? "",
          expire,
          depasse,
        },
      },
    });
  };

  // 0. La relance exceptionnelle, réservée à ceux qui ont DÉJÀ perdu leur
  // vérification : plus rien ne les atteint, la tâche quotidienne ne regarde
  // que les garages encore vérifiés. Ceux-là suivent le chemin normal —
  // prévenus quinze jours avant, prévenus de nouveau le jour du retrait.
  if (relancerPerimes) {
    const { data: perimes } = await supabase
      .from("garages")
      .select("id, raison_sociale, email, kbis_valide_jusqu_au")
      .eq("is_verified", false)
      .not("kbis_valide_jusqu_au", "is", null)
      .lt("kbis_valide_jusqu_au", aujourdhui);

    let relances = 0;
    for (const garage of (perimes ?? []) as Garage[]) {
      await prevenir(garage, true);
      // L'horloge des quinze jours repart : personne ne perd son badge dans la
      // foulée d'un message qu'il vient à peine de recevoir.
      await supabase.from("garages").update({ kbis_alerte_envoyee_le: new Date().toISOString() }).eq("id", garage.id);
      relances++;
    }
    return json({ relances });
  }

  // 1. Les échéances proches, prévenues une seule fois.
  const { data: aPrevenir } = await supabase
    .from("garages")
    .select("id, raison_sociale, email, kbis_valide_jusqu_au")
    .eq("is_verified", true)
    .is("kbis_alerte_envoyee_le", null)
    .not("kbis_valide_jusqu_au", "is", null)
    .lte("kbis_valide_jusqu_au", dans15Jours);

  let prevenus = 0;
  for (const garage of (aPrevenir ?? []) as Garage[]) {
    await prevenir(garage, false);
    await supabase.from("garages").update({ kbis_alerte_envoyee_le: new Date().toISOString() }).eq("id", garage.id);
    prevenus++;
  }

  // 2. Les échéances passées, chez des garages prévenus depuis assez longtemps.
  let requete = supabase
    .from("garages")
    .select("id, raison_sociale, email, kbis_valide_jusqu_au")
    .eq("is_verified", true)
    .not("kbis_valide_jusqu_au", "is", null)
    .lt("kbis_valide_jusqu_au", aujourdhui);
  if (!sansDelai) requete = requete.lt("kbis_alerte_envoyee_le", ilYa15Jours);

  const { data: aRetirer } = await requete;

  let retires = 0;
  for (const garage of (aRetirer ?? []) as Garage[]) {
    const { error } = await supabase
      .from("garages")
      .update({ is_verified: false, verification_requested_at: null })
      .eq("id", garage.id);
    if (error) continue;
    await prevenir(garage, true);
    retires++;
  }

  return json({ prevenus, retires });
});
