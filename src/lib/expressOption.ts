// Source unique de vérité pour l'option "Traitement express (2h)".
// Réutilisée par le parcours pro et le parcours invité.

export const EXPRESS_LABEL = "Traitement express en 2h";

// Surcoût de l'option express par type de démarche éligible.
export const EXPRESS_SURCHARGE: Record<string, number> = {
  DA: 5,
  DC: 5,
  CG: 10,
  CPI_WW: 99,
  WW_PROVISOIRE_PRO: 99, // code pro de la WW provisoire
};

// true uniquement si le type est l'une des clés de EXPRESS_SURCHARGE.
export function isExpressEligible(type: string | null | undefined): boolean {
  if (!type) return false;
  return Object.prototype.hasOwnProperty.call(EXPRESS_SURCHARGE, type);
}

// Surcoût correspondant au type, ou 0 si le type n'est pas éligible.
export function getExpressSurcharge(type: string | null | undefined): number {
  if (!isExpressEligible(type)) return 0;
  return EXPRESS_SURCHARGE[type as string];
}
