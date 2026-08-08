// Source unique de vérité pour l'affichage des dates/heures de l'espace admin.
// Les timestamps sont stockés en UTC en base : la conversion vers Europe/Paris
// doit être EXPLICITE. On ne se fie PAS au fuseau du navigateur — même règle que
// expressOption.ts, où Intl applique automatiquement l'heure d'été/hiver.

export const PARIS_TIME_ZONE = "Europe/Paris";

// hourCycle "h23" → heures 00–23, jamais "24" à minuit selon le moteur.
const PARIS_DATE_TIME = new Intl.DateTimeFormat("fr-FR", {
  timeZone: PARIS_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/**
 * "03/08/2026 21:57" à l'heure de Paris, ou null si la valeur est absente ou
 * invalide. Les deux pièges sont filtrés ici : `new Date(null)` donnerait
 * 01/01/1970, `new Date("")` un "Invalid Date".
 *
 * Le rendu passe par formatToParts et non par format() : le séparateur entre la
 * date et l'heure varie selon la version d'ICU du navigateur (espace simple,
 * espace insécable étroit, voire " à "). On assemble donc nous-mêmes pour que le
 * format soit strictement identique partout.
 */
export function formatDateTimeParis(
  value: string | Date | null | undefined
): string | null {
  if (value === null || value === undefined || value === "") return null;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = PARIS_DATE_TIME.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}`;
}

/**
 * Champs de date exploitables par les deux sources de la file admin.
 *  - guest_orders (particulier) : `paid_at`, écrit par les webhooks Stripe et
 *    Sogecommerce dans le même update que `paye: true` — c'est bien l'instant de
 *    l'encaissement.
 *  - demarches (pro) : AUCUNE colonne `paid_at`. `client_paid_at` n'est renseigné
 *    que pour le flux "lien de paiement client" (mode split) ; un paiement pro
 *    standard n'écrit aucun horodatage dédié, seulement `updated_at` (qui est
 *    écrasé à chaque modification ultérieure, donc inexploitable).
 */
export interface TransactionDateFields {
  paid_at?: string | null;
  client_paid_at?: string | null;
  created_at?: string | null;
}

export interface TransactionDateDisplay {
  /** "03/08/2026 21:57" (Europe/Paris), ou null si aucune date exploitable. */
  text: string | null;
  /** true quand aucun horodatage de paiement n'existe et qu'on affiche created_at. */
  isFallback: boolean;
}

/**
 * Horodatage de la transaction d'une ligne admin, quelle que soit son origine.
 * Repli sur la date de création faute de mieux, signalé par `isFallback` pour que
 * l'appelant puisse l'étiqueter : une heure de création ne doit jamais être lue
 * comme une heure de paiement.
 */
export function formatTransactionDate(
  row: TransactionDateFields
): TransactionDateDisplay {
  const paidAt = formatDateTimeParis(row.paid_at ?? row.client_paid_at);
  if (paidAt) return { text: paidAt, isFallback: false };

  return { text: formatDateTimeParis(row.created_at), isFallback: true };
}
