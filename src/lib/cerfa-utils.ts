/**
 * Extract Cerfa number from document label
 * Example: "Certificat de cession (cerfa 15776*01)" => "15776_01"
 */
export function extractCerfaNumber(text: string): string | null {
  const match = text.match(/cerfa\s+(\d+)\*(\d+)/i);
  if (match) {
    return `${match[1]}_${match[2]}`;
  }
  return null;
}

/**
 * Get Cerfa PDF URL from Cerfa number
 */
export function getCerfaUrl(cerfaNumber: string): string {
  return `/cerfas/cerfa_${cerfaNumber}.pdf`;
}

/**
 * Check if a Cerfa file exists (you may need to add more as you collect them)
 */
export function cerfaExists(cerfaNumber: string): boolean {
  const availableCerfas = ['15776_01', '13751_02'];
  return availableCerfas.includes(cerfaNumber);
}
