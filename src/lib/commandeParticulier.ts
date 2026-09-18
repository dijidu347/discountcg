// Accès d'un client à SA commande particulier.
//
// Les règles d'accès de la base n'ouvrent une commande (et ses pièces) qu'à la
// requête qui porte son identifiant dans cet en-tête. L'identifiant est un code
// long et aléatoire, présent uniquement dans le lien de la commande : qui a le
// lien accède à sa commande, personne ne peut plus parcourir celles des autres.
// Chaque requête sur guest_orders ou guest_order_documents côté client doit
// donc se terminer par `.setHeader(EN_TETE_COMMANDE, orderId)`.
export const EN_TETE_COMMANDE = "x-commande-id";

// Identifiant choisi avant la création : la ligne insérée n'est relisible que
// si la requête d'insertion porte déjà son identifiant.
export function nouvelIdCommande(): string {
  return crypto.randomUUID();
}
