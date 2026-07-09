// Source de vérité partagée (garage + admin) sur le mode de paiement d'une démarche.

/**
 * Un type de démarche propose-t-il un choix de mode de paiement
 * (garage paie tout / paiement partagé / client paie tout) ?
 * Seule la carte grise (CG) offre ce choix. Doit rester la SEULE définition
 * de cette règle (utilisée par NouvelleDemarche côté garage ET l'admin).
 */
export function typeHasPaymentChoice(type: string): boolean {
  return type === "CG";
}

/**
 * Libellé lisible du mode de paiement stocké dans demarches.payment_mode.
 * null (ou valeur inconnue) = garage paie tout.
 */
export function paymentModeLabel(mode: string | null): string {
  switch (mode) {
    case "split":
      return "Paiement partagé";
    case "client_pays_all":
      return "Paiement client";
    case "pro_pays_all":
      return "Paiement garage";
    default:
      return "Paiement garage";
  }
}
