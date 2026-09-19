// Genre du véhicule (case J.1) : voiture particulière ou utilitaire.
//
// Le fichier des immatriculations se trompe parfois : un Mercedes Sprinter est
// revenu « VP » (DEM-2026-07345) et la taxe utilitaire de 34 € (Y.2) n'a pas
// été facturée. Le client peut donc corriger le genre entre VP et CTTE, les
// seuls genres où la question se pose. Le serveur de paiement particulier
// accepte ce choix dans ces mêmes limites (create-sogecommerce-guest-payment).

export const GENRES_CORRIGEABLES = ["VP", "CTTE"];

export function genreCorrigeable(genre: string | null | undefined): boolean {
  return GENRES_CORRIGEABLES.includes((genre || "").toUpperCase());
}

// Modèles vendus surtout en utilitaire : un « VP » sur l'un d'eux mérite une
// vérification de la carte grise. Liste volontairement courte et connue.
const MODELES_UTILITAIRES =
  /\b(sprinter|master|trafic|kangoo|transit|jumper|boxer|ducato|vito|berlingo|partner|expert|jumpy|vivaro|crafter|transporter|caddy|doblo|movano|daily|proace|nv200|nv300|nv400|primastar|citan|combo|talento|dokker|nemo|bipper|fiorino|scudo|hilux|ranger|navara|l200|d-max|interstar|express)\b/i;

export function ressembleUtilitaire(modele: string | null | undefined): boolean {
  return MODELES_UTILITAIRES.test(modele || "");
}
