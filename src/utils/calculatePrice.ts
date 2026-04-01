import { getVehicleAge } from "./getVehicleAge";

export interface PriceCalculation {
  prixCV: number;
  prixCVAvantAbattement?: number;
  abattement: boolean;
  fraisGestion: number;
  fraisAcheminement: number;
  taxeParafiscale: number;
  prixTotal: number;
  tarifDepartement: number;
  chevauxFiscaux: number;
  anciennete: number;
}

// Y.2 — Taxe de développement des actions de formation professionnelle (transports routiers)
// Applicable aux CTTE (camionnettes ≤ 3,5T), taux 2025
const TAXE_PARAFISCALE_CTTE = 34;
const GENRES_AVEC_TAXE_PARAFISCALE = ['CTTE', 'CYCL', 'REM', 'SREM', 'TRA', 'VASP'];

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

  let prixCV = chevauxFiscaux * tarifDepartement;
  let prixCVAvantAbattement: number | undefined;
  let abattement = false;

  if (anciennete >= 10) {
    prixCVAvantAbattement = prixCV;
    prixCV = prixCV * 0.5;
    abattement = true;
  }

  const prixTotal = prixCV + taxeParafiscale + fraisGestion + fraisAcheminement;

  return {
    prixCV,
    prixCVAvantAbattement,
    abattement,
    fraisGestion,
    fraisAcheminement,
    taxeParafiscale,
    prixTotal,
    tarifDepartement,
    chevauxFiscaux,
    anciennete,
  };
};
