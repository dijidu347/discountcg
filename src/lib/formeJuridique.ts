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

export type PieceAttendue = "kbis" | "indetermine";

/**
 * Catégorie juridique INSEE → la pièce que ce professionnel peut fournir.
 *
 * On ne nomme une pièce unique que lorsqu'on en est sûr. Les codes commençant
 * par 5 sont les sociétés commerciales — SARL, SAS, SA, SNC — immatriculées au
 * registre du commerce : elles ont un Kbis, sans exception.
 *
 * Partout ailleurs, l'écran garde sa formulation générale et nomme les deux
 * documents. Le code 1000, l'entrepreneur individuel, en est l'exemple
 * principal et le piège : il recouvre deux situations opposées. L'artisan
 * réparateur relève du répertoire des métiers et n'a pas de Kbis ; le marchand
 * de voitures, lui, fait des actes de commerce, il est donc immatriculé au
 * registre du commerce et en a un — y compris en auto-entrepreneur, où
 * l'immatriculation est obligatoire depuis 2015.
 *
 * Affirmer « vous n'avez pas de Kbis » à ce dernier, c'est lui demander une
 * attestation RNE alors qu'il tient son Kbis à la main.
 */
export function pieceAttendue(code: string | null | undefined): PieceAttendue {
  if (!code) return "indetermine";
  if (code.startsWith("5")) return "kbis";
  return "indetermine";
}

export interface FicheEntreprise {
  /** Catégorie juridique INSEE. */
  code: string | null;
  /** SIRET du siège, quatorze chiffres. */
  siretSiege: string | null;
  /** Nombre d'établissements ouverts : au-delà d'un, le siège n'est pas
   *  forcément l'adresse du garage. */
  etablissements: number | null;
}

/**
 * Ce que l'État sait de cette entreprise, à partir d'un SIREN ou d'un SIRET.
 *
 * Neuf chiffres suffisent : la forme juridique appartient à l'entreprise, pas à
 * l'établissement. L'API renvoie en prime le SIRET complet du siège, ce qui
 * permet de compléter un SIREN sans rien demander de plus au garage.
 */
export async function lireFicheEntreprise(identifiant: string): Promise<FicheEntreprise> {
  const vide: FicheEntreprise = { code: null, siretSiege: null, etablissements: null };
  const chiffres = String(identifiant || "").replace(/\D/g, "");
  if (chiffres.length < 9) return vide;

  try {
    const r = await fetch(`${API}?q=${chiffres}&per_page=1`, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return vide;
    const d = await r.json();
    const e = d?.results?.[0];
    if (!e) return vide;
    return {
      code: typeof e.nature_juridique === "string" && e.nature_juridique ? e.nature_juridique : null,
      siretSiege: typeof e.siege?.siret === "string" ? e.siege.siret : null,
      etablissements: typeof e.nombre_etablissements_ouverts === "number"
        ? e.nombre_etablissements_ouverts
        : null,
    };
  } catch {
    // L'API de l'État peut être indisponible : ce n'est pas une raison pour
    // bloquer un garage qui veut déposer ses pièces. On retombe sur la
    // formulation générale, qui nomme les deux documents.
    return vide;
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

  const fiche = await lireFicheEntreprise(garage.siret);
  if (!fiche.code) return null;

  // Un SIREN de neuf chiffres se complète tout seul, quand l'entreprise n'a
  // qu'un établissement : son siège EST le garage. Vingt et un comptes se sont
  // inscrits avec le SIREN seul — ils retrouvent ainsi leur SIRET sans qu'on
  // leur redemande rien. Au-delà d'un établissement on ne touche à rien : le
  // siège pourrait être une autre adresse que l'atelier.
  const chiffres = String(garage.siret).replace(/\D/g, "");
  const patch: Record<string, string> = { forme_juridique_code: fiche.code };
  if (chiffres.length < 14 && fiche.siretSiege && fiche.etablissements === 1) {
    patch.siret = fiche.siretSiege;
  }

  // types.ts est généré depuis la base et ne connaît pas encore la colonne.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("garages").update(patch).eq("id", garage.id);
  return fiche.code;
}

/** Ce qu'on demande à l'écran, selon ce que ce professionnel peut fournir. */
export function libellePiece(attendue: PieceAttendue): { nom: string; aide: string } {
  if (attendue === "kbis") {
    return {
      nom: "Extrait Kbis",
      aide: "De moins de six mois, mentionnant une activité d'achat-vente de véhicules. Vous pouvez l'obtenir gratuitement sur monidenum.fr.",
    };
  }
  return {
    nom: "Kbis ou attestation RNE",
    aide: "De moins de six mois : un extrait Kbis si vous êtes inscrit au registre du commerce, sinon votre attestation d'immatriculation au RNE, gratuite sur data.inpi.fr.",
  };
}
