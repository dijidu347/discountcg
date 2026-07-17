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
// Disponibilité horaire de l'option "Dossier Prioritaire".
// Règle métier : ouvert lundi, mardi, mercredi, vendredi (JEUDI fermé, ainsi
// que samedi/dimanche), de 9h00 à 17h00 (16h59 accepté, 17h00 non).
// Fuseau Europe/Paris IMPÉRATIF (gère l'heure d'été/hiver via Intl), on ne se
// fie PAS à l'heure locale du navigateur.
// ---------------------------------------------------------------------------
export const EXPRESS_UNAVAILABLE_MESSAGE = "Indisponible actuellement";

// Jours ouverts, en codes courts en-US renvoyés par Intl (weekday: 'short').
const EXPRESS_OPEN_WEEKDAYS = ["Mon", "Tue", "Wed", "Fri"];

export function isExpressAvailable(now: Date = new Date()): boolean {
  // Extraction du jour de la semaine et de l'heure DANS le fuseau Europe/Paris.
  // Intl.DateTimeFormat applique automatiquement l'heure d'été/hiver de Paris.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    weekday: "short",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === "weekday")?.value;
  const rawHour = Number(parts.find((p) => p.type === "hour")?.value);
  // Certains moteurs renvoient "24" à minuit avec hour12:false → normalisé à 0.
  const hour = rawHour === 24 ? 0 : rawHour;

  if (!weekday || !EXPRESS_OPEN_WEEKDAYS.includes(weekday)) return false;
  // 9h00 inclus → hour >= 9 ; 17h00 exclu (16h59 ok) → hour < 17.
  return hour >= 9 && hour < 17;
}
