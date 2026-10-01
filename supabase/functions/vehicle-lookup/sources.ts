// D'où viennent les informations d'un véhicule.
//
// Le 1er octobre 2026, l'identification des plaques s'est arrêtée net sur tout
// le site : le revendeur RapidAPI que nous interrogions renvoyait « Token
// invalide » sur chaque plaque. Ce n'était ni notre clé ni notre abonnement,
// c'était lui qui avait perdu l'accès à sa propre source — auto-ways.net. Une
// seule source, et un intermédiaire de surcroît, suffisait donc à arrêter les
// commandes.
//
// Les sources sont désormais une liste, essayées dans l'ordre. Une source qui
// ne répond pas passe la main à la suivante ; il n'y a panne que lorsque
// toutes ont échoué. Ajouter un fournisseur, c'est ajouter une entrée ici et
// un secret, sans toucher au reste.
//
// L'ordre n'est pas neutre : l'accès direct passe avant le revendeur, parce
// qu'il coûte moins cher à la requête et qu'il a une intermédiaire de moins
// pour tomber en panne.

export type Issue =
  | { sorte: "trouve"; brut: unknown }
  | { sorte: "inconnu" }
  | { sorte: "panne"; detail: string };

export type Source = {
  nom: string;
  /** Une source sans identifiant configuré est simplement absente de la liste. */
  configuree: boolean;
  interroger: (plaque: string) => Promise<Issue>;
};

const MS_AVANT_ABANDON = 12_000;

// Une source lente bloque le client aussi sûrement qu'une source en panne, et
// la suivante n'aura jamais sa chance si on l'attend indéfiniment.
async function recuperer(url: string, entetes: Record<string, string> = {}): Promise<Response> {
  const arret = AbortSignal.timeout(MS_AVANT_ABANDON);
  return await fetch(url, { method: "GET", headers: entetes, signal: arret });
}

// auto-ways renvoie ses erreurs dans le corps autant que dans le statut :
// { "code": 403, "error": true, "message": "Token invalide", "data": [] }.
// Lire les deux évite de prendre un refus pour un véhicule introuvable.
function codeAnnonce(corps: unknown): number | null {
  if (corps && typeof corps === "object") {
    const c = (corps as Record<string, unknown>).code;
    if (typeof c === "number") return c;
    if (typeof c === "string" && /^\d+$/.test(c)) return Number(c);
  }
  return null;
}

async function lireIssue(reponse: Response): Promise<Issue> {
  const texte = await reponse.text().catch(() => "");
  let corps: unknown = null;
  try { corps = JSON.parse(texte); } catch { corps = null; }

  const code = codeAnnonce(corps) ?? reponse.status;

  // « Ce véhicule est inconnu » est une réponse, pas une panne : le client doit
  // l'entendre, et aucune autre source n'y changera rien puisqu'elles lisent le
  // même fichier national.
  if (code === 404) return { sorte: "inconnu" };

  // Tout le reste — jeton refusé, quota épuisé, serveur à terre — veut dire que
  // la source n'a rien pu dire. On passe à la suivante.
  if (!reponse.ok || code >= 400) {
    return { sorte: "panne", detail: `${reponse.status} ${texte.slice(0, 200)}`.trim() };
  }

  return { sorte: "trouve", brut: corps };
}

async function interrogerOuPanne(appel: () => Promise<Response>): Promise<Issue> {
  try {
    return await lireIssue(await appel());
  } catch (e) {
    // Coupure réseau, DNS, délai dépassé : une panne comme une autre.
    return { sorte: "panne", detail: e instanceof Error ? e.message : String(e) };
  }
}

const HOTE_RAPIDAPI = "api-de-plaque-d-immatriculation-france.p.rapidapi.com";

export function sourcesDisponibles(): Source[] {
  const jetonDirect = Deno.env.get("AUTOWAYS_TOKEN");
  const cleRapidapi = Deno.env.get("RAPIDAPI_KEY");

  const toutes: Source[] = [
    {
      nom: "auto-ways",
      configuree: !!jetonDirect,
      interroger: (plaque) =>
        interrogerOuPanne(() =>
          recuperer(
            `https://app.auto-ways.net/api/v1/fr?plaque=${encodeURIComponent(plaque)}` +
              `&token=${encodeURIComponent(jetonDirect ?? "")}`,
          )
        ),
    },
    {
      nom: "rapidapi",
      configuree: !!cleRapidapi,
      interroger: (plaque) =>
        interrogerOuPanne(() =>
          recuperer(`https://${HOTE_RAPIDAPI}/?plaque=${encodeURIComponent(plaque)}`, {
            plaque,
            "x-rapidapi-host": HOTE_RAPIDAPI,
            "x-rapidapi-key": cleRapidapi ?? "",
          })
        ),
    },
  ];

  return toutes.filter((s) => s.configuree);
}
