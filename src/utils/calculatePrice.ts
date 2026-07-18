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
const GENRES_AVEC_TAXE_PARAFISCALE = ['CTTE', 'CYCL', 'REM', 'SREM', 'TRA', 'VASP'];

// Genres moto (codes officiels arrêté du 9 février 2009) → demi-tarif Y.1.
export const MOTO_GENRES = ["MTL", "MTT1", "MTT2"];

// Genres reconnus par le calcul (VP + genres parafiscale + motos). Sert au
// garde-fou : tout autre code de genre présent est logué (console.warn) au lieu
// d'être facturé au plein tarif silencieusement.
const GENRES_CONNUS = new Set<string>(['VP', ...GENRES_AVEC_TAXE_PARAFISCALE, ...MOTO_GENRES]);

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

  let prixCV = chevauxFiscaux * tarifDepartement;
  let prixCVAvantAbattement: number | undefined;
  let abattement = false;

  // Demi-tarif moto (Y.1 ÷ 2) OU abattement 10 ans, JAMAIS les deux (pas de
  // quart de tarif). Une moto ancienne reste à demi-tarif simple ; pour une
  // moto, `abattement` reste false (pas de badge « abattement 10 ans »).
  if (isMoto) {
    prixCV = prixCV * 0.5;
  } else if (anciennete >= 10) {
    prixCVAvantAbattement = prixCV;
    prixCV = prixCV * 0.5;
    abattement = true;
  }

  // Arrondi à l'euro SUPÉRIEUR du sous-total (hors redevance), avec recalage
  // au centime pour éviter qu'une erreur de virgule flottante fasse sauter un euro.
  const sousTotal = prixCV + taxeParafiscale + fraisGestion;
  const sousTotalArrondi = Math.ceil(Math.round(sousTotal * 100) / 100);
  const prixTotal = sousTotalArrondi + fraisAcheminement;

  return {
    prixCV,
    prixCVAvantAbattement,
    abattement,
    fraisGestion,
    fraisAcheminement,
    taxeParafiscale,
    sousTotal,
    sousTotalArrondi,
    prixTotal,
    tarifDepartement,
    chevauxFiscaux,
    anciennete,
  };
};
