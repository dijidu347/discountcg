// Le tarif affiché sur les pages publiques.
//
// Il est lu dans la base, jamais écrit à la main dans le texte de la page :
// c'est exactement le prix_base que la commande appliquera ensuite. Un prix
// annoncé qui ne correspond pas à celui facturé est le premier grief de la
// DGCCRF sur ce secteur, et nous l'avions déjà — deux pages annonçaient
// « à partir de 19,90 € » pour une démarche facturée 20 €.
//
// Les deux parcours ne nomment pas les démarches de la même façon : le
// catalogue particulier (guest_demarche_types) et le catalogue pro
// (actions_rapides) ont des codes distincts pour la même prestation.
export const CODE_PRO: Record<string, string> = {
  CG: "CG",
  DC: "DC",
  DA: "DA",
  CHGT_ADRESSE: "CHANGEMENT_ADRESSE_PRO",
  DUPLICATA: "DUPLICATA_CG_PRO",
  CG_NEUF: "CG_NEUF_PRO",
  SUCCESSION: "SUCCESSION_HERITAGE_PRO",
  QUITUS_FISCAL: "QUITUS_FISCAL_PRO",
  CPI_WW: "WW_PROVISOIRE_PRO",
  COTITULAIRE: "COTITULAIRE_PRO",
  MODIF_CG: "MODIF_CG_PRO",
  IMMAT_CYCLO_ANCIEN: "CYCLO_ANCIEN_PRO",
  W_GARAGE: "W_GARAGE_PRO",
  ANNULATION_CPI_WW: "ANNULATION_CPI_WW_PRO",
  FIV: "FIV_PRO",
  IMMAT_DEFINITIVE: "IMMAT_DEFINITIVE_PRO",
  CHANGEMENT_ADRESSE_LOCATAIRE: "CHANGEMENT_ADRESSE_LOCATAIRE_PRO",
  ANNULER_DC_DA: "ANNULER_CORRIGER_DC_DA_PRO",
};

// Affiche 20 et non 20,00 : un prix rond s'écrit rond.
export function formatEuro(montant: number): string {
  return Number.isInteger(montant)
    ? `${montant} €`
    : `${montant.toFixed(2).replace(".", ",")} €`;
}
