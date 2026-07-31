// Ciblage MaJi Auto dans l'espace pro DiscountCG.
//
// PRINCIPE : on ne diffuse pas de publicité, on renvoie au garage sa propre donnée.
// DiscountCG sait déjà qui vend des véhicules, à quel rythme et dans quel département.
// Une déclaration d'achat ou une plaque W Garage sont des PREUVES d'activité de négoce,
// pas des suppositions — c'est ce qu'aucun ciblage publicitaire ne peut atteindre.
//
// Ce module ne contient que des fonctions pures : il est testé, et sa sortie pilote
// l'affichage des 5 modules de recrutement. Aucun appel réseau, aucune dépendance React.

import { departementsLabels } from "@/data/departementsTarifs";

// ---------------------------------------------------------------------------
// Secteurs déjà attribués
// ---------------------------------------------------------------------------
// Le réseau ne retient qu'UN agent par département. Cette liste est de la donnée
// métier MaJi : elle doit être tenue à jour à la main pour l'instant, et migrer en
// base (ou en configuration admin) dès que le réseau grandira.
//
// Dérivée des communes actuellement attribuées :
//   Bourg-en-Bresse (01) · Saint-Quentin (02) · Charleville-Mézières (08)
//   Périgueux (24) · Vestric-et-Candiac (30) · Bordeaux + Pessac (33)
//   Orléans (45) · Mareuil-lès-Meaux (77)
// Bordeaux et Pessac étant tous deux en Gironde, 9 communes = 8 départements.
export const MAJI_DEPARTEMENTS_ATTRIBUES: readonly string[] = [
  "01", "02", "08", "24", "30", "33", "45", "77",
];

/** Extrait le code département d'un code postal français (gère la Corse et l'outre-mer). */
export function departementDepuisCodePostal(codePostal?: string | null): string | null {
  if (!codePostal) return null;
  const cp = codePostal.trim().replace(/\s/g, "");
  if (!/^\d{5}$/.test(cp)) return null;

  // Outre-mer : 97x / 98x sur trois chiffres (971 Guadeloupe, 974 La Réunion…)
  if (cp.startsWith("97") || cp.startsWith("98")) return cp.slice(0, 3);

  // Corse : 20xxx se répartit entre 2A (Corse-du-Sud) et 2B (Haute-Corse).
  // Découpage usuel : < 20200 → 2A, ≥ 20200 → 2B. Approximation admise par
  // l'administration pour le rattachement postal.
  if (cp.startsWith("20")) return Number(cp) < 20200 ? "2A" : "2B";

  return cp.slice(0, 2);
}

/** Nom du département ("29" → "Finistère"), ou null si le code est inconnu. */
export function nomDepartement(code?: string | null): string | null {
  if (!code) return null;
  return departementsLabels[code] ?? null;
}

/** Un secteur est-il encore libre ? Un département inconnu est considéré libre. */
export function secteurEstLibre(codeDepartement?: string | null): boolean {
  if (!codeDepartement) return true;
  return !MAJI_DEPARTEMENTS_ATTRIBUES.includes(codeDepartement);
}

// ---------------------------------------------------------------------------
// Signaux d'activité, calculés depuis les démarches du garage
// ---------------------------------------------------------------------------

/** Codes de démarche porteurs de sens commercial pour MaJi. */
export const TYPE_CESSION = "DC"; // Déclaration de cession — le garage a vendu
export const TYPE_ACHAT = "DA"; // Déclaration d'achat — le garage a acheté pour revendre
export const TYPE_W_GARAGE = "W_GARAGE"; // Plaque W — activité de négoce déclarée

/** Forme minimale attendue d'une démarche (compatible avec la table `demarches`). */
export interface DemarcheComptable {
  type?: string | null;
  created_at?: string | null;
  /** Le dashboard ne charge que les démarches payées ; on reste cohérent avec lui. */
  paye?: boolean | null;
}

export interface MajiSignaux {
  /** Cessions sur 90 jours glissants — déclencheur de la tuile miroir. */
  cessions90j: number;
  /** Cessions depuis le 1er janvier — chiffre affiché dans la tuile. */
  cessionsAnneeCivile: number;
  /** Cessions sur 12 mois glissants — volume annoncé dans la candidature. */
  cessions12Mois: number;
  /** Déclarations d'achat sur 12 mois — preuve d'activité de négoce. */
  achats12Mois: number;
  /** Le garage a-t-il déjà demandé une plaque W Garage ? */
  aPlaqueWGarage: boolean;
  /** Abonné au Coffre-fort : la barrière de l'abonnement mensuel est franchie. */
  abonneCoffre: boolean;
  /** Le département du garage est-il encore ouvert ? */
  secteurLibre: boolean;
}

function estDansLaFenetre(dateISO: string | null | undefined, depuis: Date): boolean {
  if (!dateISO) return false;
  const d = new Date(dateISO);
  return !Number.isNaN(d.getTime()) && d >= depuis;
}

/**
 * Calcule les signaux d'activité depuis les démarches déjà chargées par le dashboard.
 * Aucune requête supplémentaire : le tableau passé est celui que Dashboard.tsx possède
 * déjà en mémoire, ce qui garantit que le compteur affiché correspond exactement aux
 * statistiques que le garage voit juste au-dessus.
 */
export function calculerSignaux(
  demarches: DemarcheComptable[] | null | undefined,
  options: { abonneCoffre?: boolean; codePostal?: string | null; now?: Date } = {},
): MajiSignaux {
  const now = options.now ?? new Date();
  const il90j = new Date(now.getTime() - 90 * 24 * 3600 * 1000);
  const il12m = new Date(now.getTime() - 365 * 24 * 3600 * 1000);
  const debutAnnee = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));

  // On ne compte que les démarches réellement engagées (payées), comme le dashboard.
  const reelles = (demarches ?? []).filter((d) => d.paye !== false);

  const cessions = reelles.filter((d) => d.type === TYPE_CESSION);
  const achats = reelles.filter((d) => d.type === TYPE_ACHAT);

  const departement = departementDepuisCodePostal(options.codePostal);

  return {
    cessions90j: cessions.filter((d) => estDansLaFenetre(d.created_at, il90j)).length,
    cessionsAnneeCivile: cessions.filter((d) => estDansLaFenetre(d.created_at, debutAnnee)).length,
    cessions12Mois: cessions.filter((d) => estDansLaFenetre(d.created_at, il12m)).length,
    achats12Mois: achats.filter((d) => estDansLaFenetre(d.created_at, il12m)).length,
    aPlaqueWGarage: reelles.some((d) => d.type === TYPE_W_GARAGE),
    abonneCoffre: options.abonneCoffre === true,
    secteurLibre: secteurEstLibre(departement),
  };
}

// ---------------------------------------------------------------------------
// Segmentation — le tableau des règles d'affichage
// ---------------------------------------------------------------------------

export type MajiSegment =
  | "negociant" // DA ou W Garage : achète et revend déjà
  | "abonne_coffre" // paie déjà un abonnement mensuel
  | "vendeur_regulier" // ≥ 5 cessions sur 90 jours
  | "vendeur_occasionnel" // 1 à 4 cessions
  | "mecanique"; // aucune cession : pas de négoce aujourd'hui

export type MajiPriorite = "max" | "haute" | "moyenne" | "basse" | "aucune";

export interface MajiCiblage {
  segment: MajiSegment;
  priorite: MajiPriorite;
  /** Le secteur est pris : liste d'attente uniquement, JAMAIS de pitch complet. */
  listeAttenteSeulement: boolean;
  /** Faut-il afficher la tuile miroir (module 01) ? */
  afficherTuileMiroir: boolean;
  /** Le compteur à mettre en avant dans la tuile, si elle s'affiche. */
  compteurMisEnAvant: number;
}

/**
 * Applique le tableau des règles d'affichage de l'artifact.
 *
 * Ordre de priorité (le premier qui matche gagne) :
 *   1. négociant avéré (DA ou W Garage)     → MAX
 *   2. abonné Coffre-fort                    → MAX
 *   3. ≥ 5 cessions / 90 j                   → HAUTE, tuile miroir
 *   4. 1 à 4 cessions                        → MOYENNE
 *   5. aucune cession                        → BASSE
 *
 * Un secteur déjà attribué ne change PAS le segment (le garage reste un bon profil),
 * mais impose la liste d'attente et interdit le pitch complet : mentir sur la rareté
 * détruirait sa crédibilité sur tout le reste du réseau.
 */
export function ciblerGarage(signaux: MajiSignaux): MajiCiblage {
  const secteurPris = !signaux.secteurLibre;

  let segment: MajiSegment;
  let priorite: MajiPriorite;

  if (signaux.achats12Mois > 0 || signaux.aPlaqueWGarage) {
    segment = "negociant";
    priorite = "max";
  } else if (signaux.abonneCoffre) {
    segment = "abonne_coffre";
    priorite = "max";
  } else if (signaux.cessions90j >= 5) {
    segment = "vendeur_regulier";
    priorite = "haute";
  } else if (signaux.cessions90j >= 1 || signaux.cessionsAnneeCivile >= 1) {
    segment = "vendeur_occasionnel";
    priorite = "moyenne";
  } else {
    segment = "mecanique";
    priorite = "basse";
  }

  // La tuile miroir n'a de sens que si le garage a un chiffre à se voir opposer.
  // Sur un secteur pris, on ne déroule pas l'argumentaire.
  const afficherTuileMiroir = !secteurPris && signaux.cessionsAnneeCivile >= 1 && signaux.cessions90j >= 5;

  return {
    segment,
    priorite: secteurPris ? "aucune" : priorite,
    listeAttenteSeulement: secteurPris,
    afficherTuileMiroir,
    compteurMisEnAvant: signaux.cessionsAnneeCivile,
  };
}
