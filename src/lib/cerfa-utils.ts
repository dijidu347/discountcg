/**
 * Extract Cerfa number from document label.
 * Supports both formats:
 * - "(cerfa 15776*01)" => "15776_01"
 * - "(Cerfa 13757)"   => mapped to latest known version, e.g. "13757_03"
 */
export function extractCerfaNumber(text: string): string | null {
  const match = text.match(/cerfa\s+(\d+)(?:\*(\d+))?/i);
  if (!match) return null;

  const number = match[1];
  const version = match[2];

  if (version) {
    return `${number}_${version}`;
  }

  // If version is missing, fallback to the latest known version we ship in /public/cerfas
  const latestByNumber: Record<string, string> = {
    "15776": "15776_01",
    "13751": "13751_02",
    "13750": "13750_05",
    "13757": "13757_03",
  };

  return latestByNumber[number] ?? null;
}

/**
 * Get Cerfa PDF URL from Cerfa number
 */
export function getCerfaUrl(cerfaNumber: string): string {
  return `/cerfas/cerfa_${cerfaNumber}.pdf`;
}

/**
 * Check if a Cerfa file exists
 */
export function cerfaExists(cerfaNumber: string): boolean {
  const availableCerfas = ["15776_01", "13751_02", "13750_05", "13757_03"];
  return availableCerfas.includes(cerfaNumber);
}

/**
 * Get Cerfa display name
 */
export function getCerfaDisplayName(cerfaNumber: string): string {
  return `CERFA ${cerfaNumber.replace("_", "*")}`;
}
