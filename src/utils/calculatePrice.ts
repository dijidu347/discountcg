import { getVehicleAge } from "./getVehicleAge";

/**
 * Règles de calcul carte grise 2026 par genre (case J.1)
 * Sources : service-public.fr, BOFIP BOI-AIS-MOB-10-20-30, Légifrance CIBS L.421-42+.
 *
 * y1Coef       : coefficient appliqué à (CV × tarif régional).
 *                0    = exonéré (CL cyclomoteurs, TRA agricoles, REM/SREM remorques)
 *                0.5  = demi-tarif (motos MTL/MTT1/MTT2/MTL1)
 *                1    = tarif plein (VP, CTTE, QM, VASP)
 * y2Fixed      : taxe véhicules de transport (Y.2). Uniquement CTTE ≤3,5 t.
 * ageDiscount  : véhicule éligible à l'abattement -50 % après 10 ans.
 *                Faux pour les genres déjà exonérés ou en demi-tarif (pas de cumul).
 * heavy        : catégorie non vendue en ligne (à traiter manuellement).
 */
export interface GenreRule {
  y1Coef: number;
  y2Fixed: number;
  ageDiscount: boolean;
  heavy?: boolean;
  label: string;
}

export const GENRE_RULES: Record<string, GenreRule> = {
  VP:   { y1Coef: 1,   y2Fixed: 0,  ageDiscount: true,  label: "Voiture particulière" },
  CTTE: { y1Coef: 1,   y2Fixed: 34, ageDiscount: true,  label: "Camionnette / utilitaire ≤ 3,5 t" },
  QM:   { y1Coef: 1,   y2Fixed: 0,  ageDiscount: true,  label: "Quadricycle à moteur" },
  VASP: { y1Coef: 1,   y2Fixed: 0,  ageDiscount: true,  label: "Véhicule spécialisé (camping-car, ambulance…)" },
  MTL:  { y1Coef: 0.5, y2Fixed: 0,  ageDiscount: false, label: "Motocyclette" },
  MTT1: { y1Coef: 0.5, y2Fixed: 0,  ageDiscount: false, label: "Motocyclette (tricycle)" },
  MTT2: { y1Coef: 0.5, y2Fixed: 0,  ageDiscount: false, label: "Motocyclette (tricycle)" },
  MTL1: { y1Coef: 0.5, y2Fixed: 0,  ageDiscount: false, label: "Motocyclette légère" },
  CL:   { y1Coef: 0,   y2Fixed: 0,  ageDiscount: false, label: "Cyclomoteur ≤ 50 cm³" },
  TRA:  { y1Coef: 0,   y2Fixed: 0,  ageDiscount: false, label: "Tracteur agricole" },
  REM:  { y1Coef: 0,   y2Fixed: 0,  ageDiscount: false, label: "Remorque > 500 kg" },
  SREM: { y1Coef: 0,   y2Fixed: 0,  ageDiscount: false, label: "Semi-remorque" },
  CAM:  { y1Coef: 1,   y2Fixed: 0,  ageDiscount: true,  heavy: true, label: "Camion > 3,5 t" },
  TRR:  { y1Coef: 1,   y2Fixed: 0,  ageDiscount: true,  heavy: true, label: "Tracteur routier" },
};

export const getGenreRule = (genre?: string): GenreRule => {
  if (!genre) return GENRE_RULES.VP;
  const key = genre.toUpperCase();
  return GENRE_RULES[key] ?? GENRE_RULES.VP;
};

export const isHeavyGenre = (genre?: string): boolean => {
  return !!getGenreRule(genre).heavy;
};

/**
 * Barème Y.3 (malus CO2) — WLTP 2026, applicable uniquement aux véhicules
 * de tourisme lors de leur PREMIÈRE immatriculation en France (neuf ou import
 * jamais immatriculé en France). Pour un changement de titulaire d'occasion
 * française, retourne toujours 0.
 * Plafond national 2026 : 70 000 €.
 */
export const computeMalusCO2 = (co2: number, isFirstFrenchRegistration: boolean): number => {
  if (!isFirstFrenchRegistration || !co2 || co2 < 108) return 0;
  // Approximation progressive (simplifiée) — tranche par tranche +1 g/km.
  // Pour la précision au centime, remplacer par le barème officiel complet.
  if (co2 >= 194) return 70000;
  // Interpolation linéaire simplifiée entre 108 g (50 €) et 194 g (70 000 €).
  const ratio = (co2 - 108) / (194 - 108);
  return Math.round(50 + ratio * (70000 - 50));
};

export interface PriceCalculation {
  prixCV: number;
  prixCVAvantAbattement?: number;
  abattement: boolean;
  fraisGestion: number;
  fraisAcheminement: number;
  taxeParafiscale: number;
  malus: number;
  sousTotal: number;
  sousTotalArrondi: number;
  prixTotal: number;
  tarifDepartement: number;
  chevauxFiscaux: number;
  anciennete: number;
  genre: string;
}

export interface CalculatePriceOptions {
  co2?: number;
  isFirstFrenchRegistration?: boolean;
}

export const calculatePrice = (
  tarifDepartement: number,
  chevauxFiscaux: number,
  dateMiseEnCirculation: string,
  genre?: string,
  options?: CalculatePriceOptions,
): PriceCalculation => {
  if (!tarifDepartement || tarifDepartement <= 0) {
    throw new Error('Tarif département invalide');
  }

  const rule = getGenreRule(genre);
  const genreKey = (genre || 'VP').toUpperCase();
  const anciennete = getVehicleAge(dateMiseEnCirculation);
  const fraisGestion = 11;
  const fraisAcheminement = 2.76;

  const taxeParafiscale = rule.y2Fixed;

  // Y.1 : tarif régional × CV × coefficient genre
  let prixCV = chevauxFiscaux * tarifDepartement * rule.y1Coef;
  let prixCVAvantAbattement: number | undefined;
  let abattement = false;

  // Abattement -50 % après 10 ans (uniquement pour les genres éligibles,
  // pas de cumul avec un demi-tarif ou une exonération).
  if (rule.ageDiscount && anciennete >= 10) {
    prixCVAvantAbattement = prixCV;
    prixCV = prixCV * 0.5;
    abattement = true;
  }

  // Y.3 malus CO2 (véhicules neufs / imports uniquement, genre VP)
  const malus = genreKey === 'VP'
    ? computeMalusCO2(options?.co2 ?? 0, options?.isFirstFrenchRegistration ?? false)
    : 0;

  // Arrondi à l'euro supérieur du sous-total (hors redevance).
  const sousTotal = prixCV + taxeParafiscale + malus + fraisGestion;
  const sousTotalArrondi = Math.ceil(Math.round(sousTotal * 100) / 100);
  const prixTotal = sousTotalArrondi + fraisAcheminement;

  return {
    prixCV,
    prixCVAvantAbattement,
    abattement,
    fraisGestion,
    fraisAcheminement,
    taxeParafiscale,
    malus,
    sousTotal,
    sousTotalArrondi,
    prixTotal,
    tarifDepartement,
    chevauxFiscaux,
    anciennete,
    genre: genreKey,
  };
};
