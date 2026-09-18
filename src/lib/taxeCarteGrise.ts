// Démarches particulier dont le prix comprend la taxe de carte grise : elles
// passent par le simulateur, qui calcule la taxe avant le paiement. Sans lui,
// le client ne payait que nos frais et DCG avançait la taxe à l'État.
// Liste recopiée dans create-sogecommerce-guest-payment, qui recalcule la taxe.
export const DEMARCHES_AVEC_TAXE = ["CG", "SUCCESSION", "CG_NEUF", "CPI_WW"];

// Véhicules sans plaque française (neuf, import) : pas de lecture au SIV, le
// client saisit les caractéristiques du certificat de conformité.
export const DEMARCHES_SANS_PLAQUE = ["CG_NEUF", "CPI_WW"];

export function avecTaxe(code: string | null | undefined): boolean {
  return !!code && DEMARCHES_AVEC_TAXE.includes(code);
}

export function sansPlaque(code: string | null | undefined): boolean {
  return !!code && DEMARCHES_SANS_PLAQUE.includes(code);
}

// Première immatriculation en France : le malus écologique peut s'ajouter, et
// le simulateur ne le calcule pas.
export const malusPossible = sansPlaque;
