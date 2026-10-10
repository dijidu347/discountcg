// Savoir, à partir du SIRET, si ce professionnel peut obtenir un Kbis.
//
// Le Kbis reste la règle pour une société ; l'attestation d'immatriculation au
// RNE n'est admise que pour qui ne peut pas en obtenir — un artisan, un
// entrepreneur individuel. Encore faut-il savoir dans quel cas on se trouve,
// et le demander au garage serait lui poser une question dont il ignore
// souvent la réponse : beaucoup ne savent pas s'ils relèvent du registre du
// commerce ou du répertoire des métiers, et répondraient au hasard.
//
// Or le SIRET est déjà saisi à l'inscription, et l'État publie gratuitement la
// forme juridique derrière ce numéro. On ne pose donc aucune question : on
// demande directement la bonne pièce.
//
// Le résultat est mémorisé sur la fiche du garage : la forme juridique d'une
// entreprise ne change qu'exceptionnellement, et l'API n'a pas à être appelée
// à chaque affichage.

import { supabase } from "@/integrations/supabase/client";

const API = "https://recherche-entreprises.api.gouv.fr/search";

export type PieceAttendue = "kbis" | "rne" | "indetermine";

/**
 * Catégorie juridique INSEE → la pièce que ce professionnel peut fournir.
 *
 * Les codes commençant par 5 sont les sociétés commerciales — SARL, SAS, SA,
 * SNC — immatriculées au registre du commerce : elles ont un Kbis.
 * Le code 1000 est l'entrepreneur individuel, qui n'a pas de Kbis de société.
 * Pour tout le reste on ne tranche pas, et l'écran garde sa formulation
 * générale plutôt que d'affirmer une bêtise.
 */
export function pieceAttendue(code: string | null | undefined): PieceAttendue {
  if (!code) return "indetermine";
  if (code.startsWith("5")) return "kbis";
  if (code === "1000") return "rne";
  return "indetermine";
}

/** La forme juridique derrière un SIRET, ou null si l'API ne répond pas. */
export async function lireFormeJuridique(siret: string): Promise<string | null> {
  const chiffres = String(siret || "").replace(/\D/g, "");
  if (chiffres.length < 9) return null;

  try {
    const r = await fetch(`${API}?q=${chiffres}&per_page=1`, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const d = await r.json();
    const code = d?.results?.[0]?.nature_juridique;
    return typeof code === "string" && code ? code : null;
  } catch {
    // L'API de l'État peut être indisponible : ce n'est pas une raison pour
    // bloquer un garage qui veut déposer ses pièces. On retombe sur la
    // formulation générale, qui nomme les deux documents.
    return null;
  }
}

/**
 * La forme juridique du garage, lue une fois puis mémorisée.
 *
 * Renvoie le code déjà connu sans appeler l'API, et ne tente la lecture que la
 * première fois.
 */
export async function formeJuridiqueDuGarage(garage: {
  id: string;
  siret?: string | null;
  forme_juridique_code?: string | null;
}): Promise<string | null> {
  if (garage.forme_juridique_code) return garage.forme_juridique_code;
  if (!garage.siret) return null;

  const code = await lireFormeJuridique(garage.siret);
  if (!code) return null;

  // types.ts est généré depuis la base et ne connaît pas encore la colonne.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("garages").update({ forme_juridique_code: code }).eq("id", garage.id);
  return code;
}

/** Ce qu'on demande à l'écran, selon ce que ce professionnel peut fournir. */
export function libellePiece(attendue: PieceAttendue): { nom: string; aide: string } {
  if (attendue === "kbis") {
    return {
      nom: "Extrait Kbis",
      aide: "De moins de six mois, mentionnant une activité d'achat-vente de véhicules. Vous pouvez l'obtenir gratuitement sur monidenum.fr.",
    };
  }
  if (attendue === "rne") {
    return {
      nom: "Attestation d'immatriculation au RNE",
      aide: "De moins de six mois. En tant qu'entrepreneur individuel vous n'avez pas de Kbis : c'est cette attestation qui en tient lieu. Elle est gratuite et immédiate sur data.inpi.fr.",
    };
  }
  return {
    nom: "Kbis ou attestation RNE",
    aide: "De moins de six mois : un extrait Kbis si vous êtes inscrit au registre du commerce, sinon votre attestation d'immatriculation au RNE, gratuite sur data.inpi.fr.",
  };
}
