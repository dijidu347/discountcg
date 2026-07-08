// Statuts terminaux : au-delà, aucun refus documentaire n'est "d'actualité".
export const TERMINAL_STATUSES = ["valide", "finalise", "refuse", "termine"];

export type DemarcheStatusBadge = { color: string; label: string };

/**
 * SOURCE DE VÉRITÉ UNIQUE de la pastille de synthèse (démarches ET guest_orders).
 * Priorité — la première règle applicable gagne :
 *   1. NOIR  "Refusé"              → statut = refuse
 *   2. ROUGE "Doc refusé"          → hasActiveRejectedDoc (dernier doc par type = rejected, démarche non terminale)
 *   3. JAUNE "Paiement en attente" → en_attente_paiement_client / en_attente_paiement_pro UNIQUEMENT
 *   4. VERT  "Finalisé"            → finalise / termine
 *   5. BLEU  "En cours"            → tout le reste
 */
export function getDemarcheStatusBadge({
  statut,
  hasActiveRejectedDoc,
}: {
  statut: string | null | undefined;
  hasActiveRejectedDoc: boolean;
}): DemarcheStatusBadge {
  if (statut === "refuse")
    return { color: "bg-gray-800 text-white hover:bg-gray-800", label: "Refusé" };
  if (hasActiveRejectedDoc)
    return { color: "bg-red-600 text-white hover:bg-red-600", label: "Doc refusé" };
  if (statut === "en_attente_paiement_client" || statut === "en_attente_paiement_pro")
    return { color: "bg-amber-500 text-black hover:bg-amber-500", label: "Paiement en attente" };
  if (statut === "finalise" || statut === "termine")
    return { color: "bg-green-600 text-white hover:bg-green-600", label: "Finalisé" };
  return { color: "bg-blue-600 text-white hover:bg-blue-600", label: "En cours" };
}
