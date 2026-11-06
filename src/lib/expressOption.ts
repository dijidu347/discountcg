// Source unique de vérité pour l'option "Traitement express (2h)".
// Réutilisée par le parcours pro et le parcours invité.

export const EXPRESS_LABEL = "Dossier Prioritaire";

export const EXPRESS_DESCRIPTION = "Démarche traitée en priorité, vous garantissant un traitement en 2h au lieu de 24h";

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

// ---------------------------------------------------------------------------
// Horaires de bureau.
//
// L'option « Dossier Prioritaire » est désormais proposée EN PERMANENCE : une
// commande passée un dimanche soir est légitime, et la faire disparaître de la
// page privait le client d'un service qu'il voulait prendre.
//
// Ce qui change hors horaires, c'est la PROMESSE. « Traité en 2h » est faux à
// 23h un samedi : la démarche sera traitée en priorité, mais à la réouverture.
// On le dit, plutôt que de laisser croire ou de masquer l'option.
//
// Horaires : du lundi au vendredi, de 8h00 à 17h30. 17h29 est dedans, 17h30
// non. Fuseau Europe/Paris IMPÉRATIF (Intl gère l'heure d'été et d'hiver) : on
// ne se fie PAS à l'heure locale du navigateur, qui peut être n'importe où.
// ---------------------------------------------------------------------------

/** Ce qu'on affiche hors horaires, à la place de la promesse de 2 heures. */
export const EXPRESS_HORS_HORAIRES =
  "Votre démarche sera traitée en priorité à la réouverture de nos services, aux horaires de bureau.";

const JOURS_OUVRES = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const OUVERTURE_MIN = 8 * 60;        // 08h00
const FERMETURE_MIN = 17 * 60 + 30;  // 17h30, exclue

/**
 * Sommes-nous dans les horaires de bureau ?
 *
 * Ne commande plus l'affichage de l'option — seulement le message qui
 * l'accompagne.
 */
export function dansLesHorairesDeBureau(now: Date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const jour = parts.find((p) => p.type === "weekday")?.value;
  const brut = Number(parts.find((p) => p.type === "hour")?.value);
  const minute = Number(parts.find((p) => p.type === "minute")?.value);
  // Certains moteurs renvoient « 24 » à minuit avec hour12:false.
  const heure = brut === 24 ? 0 : brut;

  if (!jour || !JOURS_OUVRES.includes(jour)) return false;
  const minutes = heure * 60 + minute;
  return minutes >= OUVERTURE_MIN && minutes < FERMETURE_MIN;
}
