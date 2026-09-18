// Démarches particulier dont DCG encaisse la taxe régionale : elles passent par
// le simulateur, qui la calcule avant le paiement. Pour les autres démarches, le
// client règle lui-même ses taxes et ne nous paie que les frais.
// Liste recopiée dans create-sogecommerce-guest-payment, qui recalcule la taxe.
export const DEMARCHES_AVEC_TAXE = ["CG", "IMMAT_DEFINITIVE"];

// Pas de lecture au SIV (plaque WW provisoire) : le client saisit les
// caractéristiques du véhicule.
export const DEMARCHES_SANS_PLAQUE = ["IMMAT_DEFINITIVE"];

export function avecTaxe(code: string | null | undefined): boolean {
  return !!code && DEMARCHES_AVEC_TAXE.includes(code);
}

export function sansPlaque(code: string | null | undefined): boolean {
  return !!code && DEMARCHES_SANS_PLAQUE.includes(code);
}

// Première immatriculation en France : le malus écologique peut s'ajouter, et
// le simulateur ne le calcule pas.
export const malusPossible = sansPlaque;

// Démarches donnant lieu à une nouvelle carte grise dont le client paie
// lui-même les taxes : on le lui dit avant qu'il paie nos frais.
export const TAXES_A_REGLER_PAR_LE_CLIENT = ["SUCCESSION", "CG_NEUF", "CPI_WW"];
