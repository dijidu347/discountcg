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
  /**
   * Vrai quand la taxe Y.2 dépend du poids total autorisé en charge, que nous
   * ne lisons pas : camion, tracteur routier, VASP. Le montant rendu retient la
   * tranche la plus haute, et baissera dès que le poids sera renseigné.
   */
  taxeADeterminer?: boolean;
}

// Le barème officiel, recopié des données de référence du simulateur de
// Service-Public (DILA, data.gouv.fr, licence ouverte) :
// https://www.data.gouv.fr/datasets/simulateur-de-cout-du-certificat-dimmatriculation-carte-grise
//
// Pour chaque genre (case J.1) : le coefficient appliqué à la taxe régionale
// selon l'âge du véhicule, et la taxe Y.2 de formation professionnelle des
// transports. Avant cette table, seuls les genres légers étaient traités ; un
// camion était facturé au plein tarif et sa taxe transport — 127 à 285 € —
// passait à la trappe.
interface Bareme {
  /** Coefficient sur la taxe régionale avant dix ans (1 = plein tarif). */
  moins10: number;
  /** Coefficient à partir de dix ans de mise en circulation. */
  plus10: number;
  /** Taxe Y.2, en euros. */
  y2: number;
  /** Redevance d'acheminement Y.5 : nulle pour le seul cyclomoteur. */
  y5: number;
  /**
   * Vrai quand le barème officiel dépend du poids total autorisé en charge,
   * que le fichier des immatriculations ne nous donne pas. On retient alors la
   * tranche la PLUS HAUTE : une estimation basse ne se corrige jamais, puisque
   * personne ne remplit un champ qui ferait monter le prix. Haute, elle
   * descend dès que le poids est saisi — et le garage a une raison de le faire.
   */
  selonPtac?: boolean;
}

const BAREMES: Record<string, Bareme> = {
  VP: { moins10: 1, plus10: 0.5, y2: 0, y5: 2.76 },
  CTTE: { moins10: 1, plus10: 0.5, y2: 34, y5: 2.76 },
  VASP: { moins10: 1, plus10: 0.5, y2: 0, y5: 2.76, selonPtac: true },
  TM: { moins10: 1, plus10: 0.5, y2: 0, y5: 2.76 },
  QM: { moins10: 1, plus10: 0.5, y2: 0, y5: 2.76 },

  // Motos : demi-tarif quel que soit l'âge.
  MTL: { moins10: 0.5, plus10: 0.5, y2: 0, y5: 2.76 },
  MTT1: { moins10: 0.5, plus10: 0.5, y2: 0, y5: 2.76 },
  MTT2: { moins10: 0.5, plus10: 0.5, y2: 0, y5: 2.76 },

  // Poids lourds : demi-tarif, et une taxe transport qui dépend du PTAC
  // (camion 127, 189 ou 285 € ; tracteur routier 34 ou 285 €).
  CAM: { moins10: 0.5, plus10: 0.5, y2: 285, y5: 2.76, selonPtac: true },
  TRR: { moins10: 0.5, plus10: 0.5, y2: 285, y5: 2.76, selonPtac: true },
  TCP: { moins10: 0.5, plus10: 0.5, y2: 285, y5: 2.76 },

  // Exonérés de taxe régionale. Le cyclomoteur l'est aussi de l'acheminement :
  // aucun titre ne lui est expédié.
  CL: { moins10: 0, plus10: 0, y2: 0, y5: 0 },
  CYCL: { moins10: 0, plus10: 0, y2: 0, y5: 0 },
  TRA: { moins10: 0, plus10: 0, y2: 0, y5: 2.76 },
  MAGA: { moins10: 0, plus10: 0, y2: 0, y5: 2.76 },
  REM: { moins10: 0, plus10: 0, y2: 0, y5: 2.76 },
  SREM: { moins10: 0, plus10: 0, y2: 0, y5: 2.76 },
  SRAT: { moins10: 0, plus10: 0, y2: 0, y5: 2.76 },
  SRTC: { moins10: 0, plus10: 0, y2: 0, y5: 2.76 },
  RETC: { moins10: 0, plus10: 0, y2: 0, y5: 2.76 },
  SRSP: { moins10: 0, plus10: 0, y2: 0, y5: 2.76 },
  RESP: { moins10: 0, plus10: 0, y2: 0, y5: 2.76 },
  REA: { moins10: 0, plus10: 0, y2: 0, y5: 2.76 },
  SREA: { moins10: 0, plus10: 0, y2: 0, y5: 2.76 },
  MIAR: { moins10: 0, plus10: 0, y2: 0, y5: 2.76 },
};

// Les tranches de PTAC du barème, en kilogrammes (case F.2 de la carte grise).
// Sans cette information, le genre porte la tranche la plus haute ; avec elle,
// le montant est exact — et presque toujours plus bas.
function baremeSelonPtac(genre: string, ptacKg: number): Bareme | null {
  if (!ptacKg || ptacKg <= 0) return null;
  const tonnes = ptacKg / 1000;

  if (genre === "CAM") {
    const y2 = tonnes <= 6 ? 127 : tonnes <= 11 ? 189 : 285;
    return { moins10: 0.5, plus10: 0.5, y2, y5: 2.76 };
  }
  if (genre === "TRR") {
    return { moins10: 0.5, plus10: 0.5, y2: tonnes <= 3.5 ? 34 : 285, y5: 2.76 };
  }
  if (genre === "VASP") {
    // Au-delà de 3,5 t, le VASP passe au demi-tarif.
    const coef = tonnes < 3.5 ? 1 : 0.5;
    return { moins10: coef, plus10: 0.5, y2: 0, y5: 2.76 };
  }
  return null;
}

// Faute de genre lisible, on applique celui d'une voiture : c'est le cas de
// très loin le plus fréquent, et le seul qui ne sous-facture personne.
const BAREME_PAR_DEFAUT: Bareme = BAREMES.VP;

// Conservés pour les appelants existants.
export const MOTO_GENRES = ["MTL", "MTT1", "MTT2"];
export const GENRES_EXONERES_Y1 = Object.keys(BAREMES).filter((g) => BAREMES[g].moins10 === 0);

export const calculatePrice = (
  tarifDepartement: number,
  chevauxFiscaux: number,
  dateMiseEnCirculation: string,
  genre?: string,
  /** Poids total autorisé en charge, en kilogrammes (case F.2). */
  ptacKg?: number
): PriceCalculation => {
  if (!tarifDepartement || tarifDepartement <= 0) {
    throw new Error('Tarif département invalide');
  }

  const anciennete = getVehicleAge(dateMiseEnCirculation);
  const fraisGestion = 11;

  const genreUpper = genre ? genre.toUpperCase() : "";
  const bareme = BAREMES[genreUpper];

  // Garde-fou anti-silence : un genre présent mais absent du barème officiel
  // est traité comme une voiture et journalisé, pour qu'on le repère si le SIV
  // renvoie un code imprévu.
  if (genreUpper && !bareme) {
    console.warn(`[calculatePrice] genre hors barème, traité comme une voiture : "${genre}"`);
  }

  const precis = bareme?.selonPtac ? baremeSelonPtac(genreUpper, Number(ptacKg)) : null;
  const applique = precis ?? bareme ?? BAREME_PAR_DEFAUT;
  const coefficient = anciennete >= 10 ? applique.plus10 : applique.moins10;

  const prixCVPlein = chevauxFiscaux * tarifDepartement;
  const prixCV = prixCVPlein * coefficient;

  // L'abattement n'est annoncé que lorsqu'il change quelque chose : une moto,
  // à demi-tarif depuis toujours, ne « bénéficie » de rien à ses dix ans.
  const abattement = coefficient < applique.moins10;
  const prixCVAvantAbattement = abattement ? prixCVPlein : undefined;

  const taxeParafiscale = applique.y2;
  const fraisAcheminement = applique.y5;

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
    taxeADeterminer: bareme?.selonPtac === true && !precis,
  };
};
