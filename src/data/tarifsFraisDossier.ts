// Les frais de dossier, en un seul endroit.
//
// Ils étaient écrits en dur à sept endroits — l'accueil, le simulateur deux
// fois, le comparateur, les pages départements, la FAQ tarifs, le contenu de
// l'accueil — et ils avaient déjà divergé : la page déclaration de cession
// annonçait 20 € là où l'accueil disait « dès 30 € ».
//
// Les montants ci-dessous sont mesurés, pas supposés. Sur les six derniers
// mois, les 39 commandes particulier de carte grise ont toutes été facturées
// 30 €, et sur quatre-vingt-dix jours les 556 démarches garage l'ont toutes
// été 20 €. Aucune exception, dans un sens ni dans l'autre.
//
// D'où le mot qui change : ce n'est pas « à partir de », c'est un tarif fixe.
// « Dès 30 € » laissait craindre un supplément qui n'existe pas, et affaiblis-
// sait l'argument au lieu de le servir.

/** Carte grise d'un particulier. Tarif fixe, quelle que soit la démarche. */
export const FRAIS_CG_PARTICULIER = 30;

/** Carte grise d'un professionnel habilité. */
export const FRAIS_CG_PRO = 20;

/** Déclaration de cession ou d'achat, pour un professionnel. */
export const FRAIS_DECLARATION_PRO = 5;

/** Déclaration de cession pour un particulier. */
export const FRAIS_DECLARATION_PARTICULIER = 20;

/** Le même montant, prêt à écrire : « 30 € ». */
export const eur = (n: number) => `${n} €`;
