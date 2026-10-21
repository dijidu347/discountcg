// Taxe reversée à l'État, par type de démarche.
//
// Le site ne mémorise la taxe que pour la carte grise (colonne
// prix_carte_grise). Pour les démarches pro, elle sort du compte bancaire sans
// laisser de trace en base : sans cette table, elle est comptée en revenu.
//
// Une taxe de carte grise se compose de trois morceaux :
//   - la taxe régionale, variable (chevaux fiscaux × tarif du département) ;
//   - la taxe fixe de 11 € ;
//   - la redevance d'acheminement de 2,76 €, due dès qu'un titre est imprimé
//     et envoyé.
// D'où les deux montants qu'on retrouve isolés sur les relevés : 11,00 € pour
// un CPI WW (aucun titre expédié) et 13,76 € pour un W garage (titre expédié,
// exonéré de taxe régionale).

export const TAXE_FIXE = 11;
export const REDEVANCE_ACHEMINEMENT = 2.76;

// null = taxe variable, qui dépend des chevaux fiscaux et du département. Elle
// n'est pas mémorisée : impossible de la déduire, on la signale à l'écran.
const TAXE_PAR_TYPE: Record<string, number | null> = {
  // Taxe fixe seule : le CPI WW ne donne lieu à aucun envoi de titre.
  WW_PROVISOIRE_PRO: TAXE_FIXE,

  // Taxe fixe et acheminement : un titre est édité et envoyé, sans taxe
  // régionale.
  W_GARAGE_PRO: TAXE_FIXE + REDEVANCE_ACHEMINEMENT,
  DUPLICATA_CG_PRO: TAXE_FIXE + REDEVANCE_ACHEMINEMENT,
  MODIF_CG_PRO: TAXE_FIXE + REDEVANCE_ACHEMINEMENT,

  // Changement d'adresse : la taxe fixe n'est pas due, seul l'acheminement du
  // nouveau titre l'est.
  CHANGEMENT_ADRESSE_PRO: REDEVANCE_ACHEMINEMENT,
  CHANGEMENT_ADRESSE_LOCATAIRE_PRO: REDEVANCE_ACHEMINEMENT,

  // Aucune taxe.
  DA: 0,
  DC: 0,
  QUITUS_FISCAL_PRO: 0,
  FIV_PRO: 0,
  ANNULER_CORRIGER_DC_DA_PRO: 0,
  ANNULATION_CPI_WW_PRO: 0,

  // Taxe pleine, variable selon le véhicule.
  CG_NEUF_PRO: null,
  IMMAT_DEFINITIVE_PRO: null,
  SUCCESSION_HERITAGE_PRO: null,
  COTITULAIRE_PRO: null,
  CYCLO_ANCIEN_PRO: null,
};

// Types dont la taxe est déjà mémorisée dans prix_carte_grise : elle est
// déduite ailleurs, la redéduire ici la compterait deux fois.
const TAXE_DEJA_MEMORISEE = ["CG", "CG_DA", "CG_IMPORT"];

export function taxeDejaMemorisee(type: string | null | undefined): boolean {
  return TAXE_DEJA_MEMORISEE.includes(type ?? "");
}

// Montant connu de la taxe, ou null quand elle est variable et non mémorisée.
export function taxeEtat(type: string | null | undefined): number | null {
  if (!type) return 0;
  if (taxeDejaMemorisee(type)) return 0;
  const taxe = TAXE_PAR_TYPE[type];
  return taxe === undefined ? 0 : taxe;
}

// true quand la démarche supporte une taxe dont on ignore le montant : son
// revenu est alors surévalué, et il faut le dire plutôt que de le masquer.
//
// Mais le type ne suffit pas à conclure. Le 21 octobre 2026, l'écran signalait
// DEM-2026-08981 comme « revenu majoré » : une immatriculation définitive, donc
// un type à taxe variable. Or le garage avait payé 59,00 € pour 59,00 € de
// frais de dossier — à l'euro près. Rien n'avait été encaissé pour l'État, et
// il n'y avait donc rien à déduire.
//
// On regarde donc ce qui a RÉELLEMENT été encaissé. Une taxe n'est inconnue
// que si le paiement dépasse les frais de dossier sans qu'aucun montant de
// taxe ne soit mémorisé : là seulement, le surplus est de la taxe comptée à
// tort en revenu. Avertir sur le seul type faisait douter d'un chiffre juste,
// ce qui coûte autant qu'un chiffre faux.
export function taxeInconnue(
  type: string | null | undefined,
  encaisse?: number | null,
  fraisDossier?: number | null,
  taxeMemorisee?: number | null,
): boolean {
  if (taxeEtat(type) !== null) return false;
  if (Number(taxeMemorisee ?? 0) > 0) return false;
  // Sans les montants, on garde l'ancien comportement : prudent par défaut.
  if (encaisse == null || fraisDossier == null) return true;
  return Number(encaisse) - Number(fraisDossier) > 0.009;
}
