import { getVehicleAge } from "./getVehicleAge";

export interface PriceCalculation {
  prixCV: number;
  prixCVAvantAbattement?: number;
  abattement: boolean;
  fraisGestion: number;
  fraisAcheminement: number;
  prixTotal: number;
  tarifDepartement: number;
  chevauxFiscaux: number;
  anciennete: number;
}

export const calculatePrice = (
  tarifDepartement: number,
  chevauxFiscaux: number,
  dateMiseEnCirculation: string
): PriceCalculation => {
  if (!tarifDepartement || tarifDepartement <= 0) {
    throw new Error('Tarif département invalide');
  }

  const anciennete = getVehicleAge(dateMiseEnCirculation);
  const fraisGestion = 11;
  const fraisAcheminement = 2.76;

  let prixCV = chevauxFiscaux * tarifDepartement;
  let prixCVAvantAbattement: number | undefined;
  let abattement = false;

  if (anciennete >= 10) {
    prixCVAvantAbattement = prixCV;
    prixCV = prixCV * 0.5;
    abattement = true;
  }

  const prixTotal = prixCV + fraisGestion + fraisAcheminement;

  return {
    prixCV,
    prixCVAvantAbattement,
    abattement,
    fraisGestion,
    fraisAcheminement,
    prixTotal,
    tarifDepartement,
    chevauxFiscaux,
    anciennete,
  };
};
