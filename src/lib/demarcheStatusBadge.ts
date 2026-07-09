// Statuts terminaux : au-delà, aucun refus documentaire n'est "d'actualité".
export const TERMINAL_STATUSES = ["valide", "finalise", "refuse", "termine"];

export type DemarcheStatusBadge = { color: string; label: string };

/**
 * Catégories visuelles de la pastille de synthèse.
 * ⚠️ `doc_refuse` n'est PAS dérivable du statut seul (il dépend du flag
 * hasActiveRejectedDoc) : getStatusCategory ne le renvoie jamais ; seule
 * getDemarcheStatusBadge l'attribue.
 */
export type StatusCategory = "refuse" | "doc_refuse" | "paiement_attente" | "finalise" | "en_cours";

/**
 * SOURCE DE VÉRITÉ UNIQUE couleur + libellé par catégorie.
 * Toute modification de libellé/couleur se fait ICI → pastille ET menus de
 * filtre (STATUS_CATEGORIES) restent automatiquement alignés.
 */
const CATEGORY_BADGE: Record<StatusCategory, DemarcheStatusBadge> = {
  refuse:           { color: "bg-gray-800 text-white hover:bg-gray-800", label: "Refusé" },
  doc_refuse:       { color: "bg-red-600 text-white hover:bg-red-600", label: "Doc refusé" },
  paiement_attente: { color: "bg-amber-500 text-black hover:bg-amber-500", label: "Paiement en attente" },
  finalise:         { color: "bg-green-600 text-white hover:bg-green-600", label: "Finalisé" },
  en_cours:         { color: "bg-blue-600 text-white hover:bg-blue-600", label: "En cours" },
};

/**
 * Liste ORDONNÉE des catégories, pour construire les menus déroulants de filtre.
 * Libellés IDENTIQUES à ceux des pastilles (tirés de CATEGORY_BADGE).
 */
export const STATUS_CATEGORIES: Array<{ value: StatusCategory; label: string }> = [
  { value: "en_cours", label: CATEGORY_BADGE.en_cours.label },
  { value: "paiement_attente", label: CATEGORY_BADGE.paiement_attente.label },
  { value: "doc_refuse", label: CATEGORY_BADGE.doc_refuse.label },
  { value: "finalise", label: CATEGORY_BADGE.finalise.label },
  { value: "refuse", label: CATEGORY_BADGE.refuse.label },
];

/**
 * Catégorie DÉRIVÉE DU STATUT SEUL (sans le flag documentaire).
 * Même regroupement et même ordre de priorité que getDemarcheStatusBadge.
 * Ne renvoie jamais "doc_refuse". Sert aux filtres (statut brut → catégorie).
 */
export function getStatusCategory(statut: string | null | undefined): StatusCategory {
  if (statut === "refuse") return "refuse";
  if (statut === "en_attente_paiement_client" || statut === "en_attente_paiement_pro")
    return "paiement_attente";
  if (statut === "finalise" || statut === "termine") return "finalise";
  return "en_cours";
}

/**
 * SOURCE DE VÉRITÉ UNIQUE de la pastille de synthèse (démarches ET guest_orders).
 * Priorité — la première règle applicable gagne :
 *   1. "Refusé"              → statut = refuse (gagne AVANT le flag doc)
 *   2. "Doc refusé"          → hasActiveRejectedDoc (dernier doc par type = rejected, non terminale)
 *   3..5. sinon              → catégorie dérivée du statut via getStatusCategory
 *          ("Paiement en attente" / "Finalisé" / "En cours")
 */
export function getDemarcheStatusBadge({
  statut,
  hasActiveRejectedDoc,
}: {
  statut: string | null | undefined;
  hasActiveRejectedDoc: boolean;
}): DemarcheStatusBadge {
  let category: StatusCategory;
  if (statut === "refuse") category = "refuse";
  else if (hasActiveRejectedDoc) category = "doc_refuse";
  else category = getStatusCategory(statut);
  return CATEGORY_BADGE[category];
}
