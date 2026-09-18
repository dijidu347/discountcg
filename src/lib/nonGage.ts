// Source unique de vérité pour le certificat de non-gage (certificat de
// situation administrative). Réutilisée par le parcours pro et le parcours
// particulier.
//
// Règle métier : sur les démarches CG, DA et DC, la pièce est obligatoire. Soit
// le client la dépose lui-même, soit nous la commandons pour lui et elle est
// facturée. Le tarif diffère selon l'audience.
// Exception : la DC d'un particulier. L'administration ne demande pas le
// certificat pour enregistrer une cession (le vendeur le remet à l'acheteur),
// on le propose donc en option sans l'imposer.

export type NonGageMode = "fourni" | "facture";

export const NON_GAGE_LABEL = "Certificat de non-gage";

// Libellé de la pièce dans les listes de documents à déposer.
export const NON_GAGE_DOCUMENT_LABEL = "Certificat de situation administrative (non-gage)";

// Types de démarches sur lesquels la pièce est exigée. Les codes sont communs
// aux deux parcours (actions_rapides.code et guest_demarche_types.code).
const NON_GAGE_TYPES = ["CG", "DA", "DC"];

// Tarif du service quand le client ne fournit pas la pièce lui-même.
export const NON_GAGE_PRICE_PRO = 2;
export const NON_GAGE_PRICE_PARTICULIER = 10;

// true uniquement si le type exige un certificat de non-gage.
export function isNonGageRequired(type: string | null | undefined): boolean {
  if (!type) return false;
  return NON_GAGE_TYPES.includes(type);
}

// Démarches où, côté particulier, le certificat n'est qu'une option payante.
const NON_GAGE_FACULTATIF_PARTICULIER = ["DC"];

export function isNonGageOptional(
  type: string | null | undefined,
  audience: "pro" | "particulier",
): boolean {
  return audience === "particulier" && !!type && NON_GAGE_FACULTATIF_PARTICULIER.includes(type);
}

export function getNonGagePrice(audience: "pro" | "particulier"): number {
  return audience === "pro" ? NON_GAGE_PRICE_PRO : NON_GAGE_PRICE_PARTICULIER;
}

// Surcoût effectif : nul tant que le client n'a pas choisi, et nul s'il fournit
// la pièce lui-même.
export function getNonGageSurcharge(
  type: string | null | undefined,
  mode: NonGageMode | null | undefined,
  audience: "pro" | "particulier",
): number {
  if (!isNonGageRequired(type) || mode !== "facture") return 0;
  return getNonGagePrice(audience);
}
