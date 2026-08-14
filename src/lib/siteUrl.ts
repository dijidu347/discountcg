// Domaine public du site, pour construire les liens DESTINÉS À UN TIERS
// (paiement client, suivi de commande) que l'on copie ou envoie par email.
//
// Ne PAS remplacer par window.location.origin : l'admin peut être consulté
// depuis une URL de preview ou de staging, et le lien copié pointerait alors
// vers un domaine inaccessible au client. C'est déjà la raison pour laquelle
// PaiementDemarche.tsx et les edge functions codent le domaine de production
// en dur plutôt que de dériver l'origine courante.
//
// window.location.origin reste correct ailleurs, pour les redirections de
// l'utilisateur courant (useAuth.tsx, retours de paiement).
export const SITE_URL: string =
  import.meta.env.VITE_SITE_URL ?? "https://discountcartegrise.fr";
