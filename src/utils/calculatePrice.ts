import { getVehicleAge } from "./getVehicleAge";

export interface PriceCalculation {
  prixCV: number;
  prixCVAvantAbattement?: number;
  abattement: boolean;
  fraisGestion: number;
  fraisAcheminement: number;
  taxeParafiscale: number;
  sousTotal: number;
  sousTotalArrondi: number;
  prixTotal: number;
  tarifDepartement: number;
  chevauxFiscaux: number;
  anciennete: number;
}

// Y.2 — Taxe de développement des actions de formation professionnelle (transports routiers)
// Applicable aux CTTE (camionnettes ≤ 3,5T), taux 2025
const TAXE_PARAFISCALE_CTTE = 34;
// Y.2 : seule la camionnette/utilitaire ≤ 3,5 t (CTTE) paie la parafiscale
// transport. Le simulateur officiel montre 0 pour tous les autres genres.
const GENRES_AVEC_TAXE_PARAFISCALE = ['CTTE'];

// Genres moto (codes officiels arrêté du 9 février 2009) → demi-tarif Y.1.
export const MOTO_GENRES = ["MTL", "MTT1", "MTT2"];

// Genres exonérés de taxe régionale Y.1 (prixCV forcé à 0) : cyclomoteur (CL),
// tracteur / matériel agricole (TRA, MAGA), remorques (REM, SREM). Ni demi-tarif
// ni abattement ne s'appliquent ensuite — zéro.
export const GENRES_EXONERES_Y1 = ["CL", "TRA", "MAGA", "REM", "SREM"];

// Genres reconnus par le calcul (VP/VASP plein tarif + parafiscale + motos +
// exonérés). Sert au garde-fou : tout autre code de genre présent est logué
// (console.warn) au lieu d'être facturé au plein tarif silencieusement.
const GENRES_CONNUS = new Set<string>([
  'VP', 'VASP',
  ...GENRES_AVEC_TAXE_PARAFISCALE,
  ...MOTO_GENRES,
  ...GENRES_EXONERES_Y1,
]);

export const calculatePrice = (
  tarifDepartement: number,
  chevauxFiscaux: number,
  dateMiseEnCirculation: string,
  genre?: string
): PriceCalculation => {
  if (!tarifDepartement || tarifDepartement <= 0) {
    throw new Error('Tarif département invalide');
  }

  const anciennete = getVehicleAge(dateMiseEnCirculation);
  const fraisGestion = 11;
  const fraisAcheminement = 2.76;

  // Y.2 taxe parafiscale (formation professionnelle transport)
  const taxeParafiscale = genre && GENRES_AVEC_TAXE_PARAFISCALE.includes(genre.toUpperCase())
    ? TAXE_PARAFISCALE_CTTE
    : 0;

  // Genre normalisé (majuscules), pour la détection moto et le garde-fou.
  const genreUpper = genre ? genre.toUpperCase() : "";

  // Garde-fou anti-silence : un genre présent mais NON reconnu est facturé au
  // plein tarif ; on le logge pour le repérer si le SIV renvoie un code non
  // prévu (le calcul continue normalement, le warn ne bloque rien).
  if (genreUpper && !GENRES_CONNUS.has(genreUpper)) {
    console.warn(`[calculatePrice] genre non reconnu, facturé au plein tarif : "${genre}"`);
  }

  const isMoto = !!genreUpper && MOTO_GENRES.includes(genreUpper);
  const isExonereY1 = !!genreUpper && GENRES_EXONERES_Y1.includes(genreUpper);
  const isCyclomoteur = genreUpper === "CL";

  let prixCV = chevauxFiscaux * tarifDepartement;
  let prixCVAvantAbattement: number | undefined;
  let abattement = false;

  // Priorité : exonération Y.1 (prixCV = 0, ni demi-tarif ni abattement) →
  // sinon demi-tarif moto (Y.1 ÷ 2) → sinon abattement 10 ans. Jamais cumulés
  // (pas de quart de tarif ; pour un exonéré ou une moto, `abattement` reste false).
  if (isExonereY1) {
    prixCV = 0;
  } else if (isMoto) {
    prixCV = prixCV * 0.5;
  } else if (anciennete >= 10) {
    prixCVAvantAbattement = prixCV;
    prixCV = prixCV * 0.5;
    abattement = true;
  }

  // Arrondi à l'euro SUPÉRIEUR du sous-total (hors redevance), avec recalage
  // au centime pour éviter qu'une erreur de virgule flottante fasse sauter un euro.
  // Y.5 redevance d'acheminement : non facturée au cyclomoteur (CL) uniquement.
  const fraisAcheminementFacture = isCyclomoteur ? 0 : fraisAcheminement;

  const sousTotal = prixCV + taxeParafiscale + fraisGestion;
  const sousTotalArrondi = Math.ceil(Math.round(sousTotal * 100) / 100);
  const prixTotal = sousTotalArrondi + fraisAcheminementFacture;

  return {
    prixCV,
    prixCVAvantAbattement,
    abattement,
    fraisGestion,
    fraisAcheminement: fraisAcheminementFacture,
    taxeParafiscale,
    sousTotal,
    sousTotalArrondi,
    prixTotal,
    tarifDepartement,
    chevauxFiscaux,
    anciennete,
  };
};
