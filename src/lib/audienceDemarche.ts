// À qui s'adresse une démarche.
//
// Sert deux choses : le pont affiché entre les deux publics sur les pages
// démarche, et l'étiquette envoyée avec chaque événement de suivi. Meta a
// besoin de cette étiquette pour que les audiences professionnelle et
// particulier se construisent sans se mélanger — un seul pixel, deux
// campagnes.

export type Audience = "pro" | "particulier";

// Démarches que le produit réserve aux professionnels.
export const PRO_SEULEMENT = ["DA", "W_GARAGE"];

// Démarches majoritairement professionnelles à l'usage : sur douze mois, le
// CPI WW compte 80 dépôts professionnels pour 3 particuliers.
export const PRO_MAJORITAIRE = ["CPI_WW"];

// Sur une page démarche, personne ne sait qui lit. On déduit l'audience de la
// nature de la démarche, ce qui est faux parfois mais juste la plupart du
// temps — et surtout stable, donc exploitable pour une audience publicitaire.
export function audienceDeLaDemarche(code: string | null | undefined): Audience {
  if (!code) return "particulier";
  return PRO_SEULEMENT.includes(code) || PRO_MAJORITAIRE.includes(code) ? "pro" : "particulier";
}
