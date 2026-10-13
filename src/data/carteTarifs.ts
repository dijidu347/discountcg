// Ce que la carte des tarifs a besoin de savoir, calculé une fois.
//
// Le tarif du cheval fiscal est voté par la région : tous les départements
// d'une même région paient le même. La carte peut donc colorer par région
// sans rien perdre — et c'est aussi ce qui la rend lisible, treize zones au
// lieu de cent une.
//
// Aucun chiffre n'est écrit ici : tout est relu dans departementsTarifs.ts et
// departements.ts. Une délibération régionale changera donc la carte sans
// qu'on y touche.

import { DEPARTEMENTS, REGIONS, CHEMIN_DEPARTEMENT, type Departement } from "./departements";
import { departementsTarifs } from "./departementsTarifs";

export interface RegionTarif {
  cle: string;
  nom: string;
  tarif: number;
  departements: { code: string; nom: string; chemin: string }[];
}

/** Les régions, du moins cher au plus cher, avec leurs départements. */
export const REGIONS_TARIFS: RegionTarif[] = Object.keys(REGIONS)
  .map((cle) => {
    const deps = DEPARTEMENTS.filter((d) => d.region === cle);
    const premier = deps[0];
    return {
      cle,
      nom: REGIONS[cle].nom,
      tarif: premier ? departementsTarifs[premier.code] : 0,
      departements: deps
        .map((d: Departement) => ({ code: d.code, nom: d.nom, chemin: CHEMIN_DEPARTEMENT(d) }))
        .sort((a, b) => a.code.localeCompare(b.code, "fr", { numeric: true })),
    };
  })
  .filter((r) => r.departements.length > 0)
  .sort((a, b) => a.tarif - b.tarif || a.nom.localeCompare(b.nom, "fr"));

export const TARIF_MIN = Math.min(...REGIONS_TARIFS.map((r) => r.tarif));
export const TARIF_MAX = Math.max(...REGIONS_TARIFS.map((r) => r.tarif));

/** Le tarif moyen pondéré par le nombre de départements. */
export const TARIF_MOYEN =
  REGIONS_TARIFS.reduce((s, r) => s + r.tarif * r.departements.length, 0) /
  REGIONS_TARIFS.reduce((s, r) => s + r.departements.length, 0);

/**
 * La couleur d'une région, du vert au rouge.
 *
 * Vert pour le moins cher : sur un site qui s'appelle Discount, l'intuition
 * du lecteur va dans ce sens, et l'inverser le ferait trébucher.
 *
 * L'échelle est posée sur la racine de l'écart, pas sur l'écart lui-même :
 * dix régions sur dix-huit sont à 60 €, et une échelle linéaire les aurait
 * toutes peintes de la même teinte en écrasant les quatre qui s'en écartent.
 */
export function couleurTarif(tarif: number): string {
  const f = Math.sqrt(
    Math.max(0, Math.min(1, (tarif - TARIF_MIN) / (TARIF_MAX - TARIF_MIN))),
  );
  const teinte = 152 - 152 * f;          // 152 = vert, 0 = rouge
  const saturation = 46 + 26 * f;
  const clarte = 44 - 6 * f;
  return `hsl(${teinte.toFixed(0)} ${saturation.toFixed(0)}% ${clarte.toFixed(0)}%)`;
}

/** « 68,95 € » et « 43 € », jamais « 43,00 € ». */
export const euroCourt = (n: number) =>
  (Number.isInteger(n) ? String(n) : n.toLocaleString("fr-FR", { minimumFractionDigits: 2 })) + " €";
