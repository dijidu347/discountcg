// Les repères factuels de la déclaration d'achat.
//
// « Déclaration d'achat » et ses variantes professionnelles représentent 1 804
// impressions sur seize mois pour TROIS clics, en positions 23 à 66. La page
// existe et dit l'essentiel, mais en six écrans courts : qui doit la faire,
// les pièces, le délai, le tarif. Rien de ce que la requête cherche vraiment.
//
// Or ces requêtes sont presque toutes professionnelles — « déclaration d'achat
// professionnel automobile en ligne » à lui seul pèse 302 impressions, et le
// mot « professionnel » revient dans 620 d'entre elles. C'est exactement le
// canal qui fait 95 % de l'activité, et il n'en vient aucun visiteur.
//
// Trois choses manquaient, que ce module apporte : la comparaison avec les
// deux démarches qu'on lui confond sans cesse, ce qu'on a le droit de faire
// d'un véhicule une fois la déclaration passée, et les conséquences chiffrées
// de l'oubli.

export interface LigneComparatif {
  critere: string;
  achat: string;
  cession: string;
  titulaire: string;
}

export interface Repere {
  titre: string;
  texte: string;
}

/** Les trois démarches qu'on confond, mises côte à côte. */
export const COMPARATIF: LigneComparatif[] = [
  {
    critere: "Qui la fait",
    achat: "Le professionnel qui achète pour revendre",
    cession: "Le vendeur, particulier ou professionnel",
    titulaire: "L'acheteur qui garde le véhicule",
  },
  {
    critere: "Nouvelle carte grise",
    achat: "Non",
    cession: "Non",
    titulaire: "Oui, au nom de l'acheteur",
  },
  {
    critere: "Taxe régionale",
    achat: "Aucune",
    cession: "Aucune",
    titulaire: "Due, selon la puissance fiscale et le département",
  },
  {
    critere: "Au nom de qui reste le véhicule",
    achat: "De l'ancien propriétaire, jusqu'à la revente",
    cession: "De personne : il sort du parc du vendeur",
    titulaire: "Du nouveau titulaire",
  },
  {
    critere: "Délai",
    achat: "15 jours après l'achat",
    cession: "15 jours après la vente",
    titulaire: "1 mois après l'achat",
  },
  {
    critere: "Notre tarif",
    achat: "5 €, la première offerte",
    cession: "5 €, la première offerte",
    titulaire: "20 € pour un professionnel, 30 € pour un particulier, hors taxes",
  },
];

/** Ce que la page ne disait nulle part, et qu'un garage demande. */
export const REPERES_ACHAT: Repere[] = [
  {
    titre: "Ce que la déclaration vous autorise à faire du véhicule",
    texte:
      "Elle vous en donne la détention, pas l'immatriculation. Le véhicule garde la carte grise de l'ancien propriétaire, et vous ne pouvez pas circuler avec sur la voie publique au titre de cette carte grise. Pour le déplacer, l'essayer ou l'amener chez un carrossier, il faut une plaque W garage, qui est attribuée à votre entreprise et non au véhicule. Une fois revendu, c'est l'acheteur final qui fait établir la carte grise à son nom.",
  },
  {
    titre: "Ce que vous évitez en la faisant",
    texte:
      "Sans déclaration, le véhicule reste rattaché à son ancien propriétaire : les contraventions, les avis de contrôle technique et les courriers de l'administration continuent de partir chez lui. Il a alors tout intérêt à vous désigner, et c'est vous qui répondrez — avec un temps de retard et sans preuve de la date d'achat.",
  },
  {
    titre: "Combien de temps un véhicule peut rester sous déclaration d'achat",
    texte:
      "Aucune durée maximale n'est fixée par les textes : un véhicule peut rester en détention professionnelle le temps qu'il faut pour le revendre. Ce qui compte est la cohérence avec votre activité — un stock qui ne tourne pas est ce qui attire l'attention, pas la durée elle-même.",
  },
  {
    titre: "Qui peut en faire une",
    texte:
      "Un professionnel de l'automobile qui achète pour revendre : garage, concession, négociant, agent. L'activité doit figurer sur l'extrait Kbis ou l'attestation d'immatriculation au RNE, et c'est cette pièce qui l'atteste. Un particulier ne peut pas en faire : il relève du changement de titulaire, dans le mois qui suit l'achat.",
  },
  {
    titre: "Ce qu'il faut avoir sous la main",
    texte:
      "Le certificat de cession rempli par les deux parties (Cerfa 15776), la déclaration d'achat elle-même (Cerfa 13751), la carte grise barrée avec la mention « vendu le », datée et signée du vendeur, recto et verso, et le mandat qui nous autorise à déposer (Cerfa 13757). Si vous avez acheté à un autre professionnel, ajoutez son récépissé de déclaration d'achat. Votre Kbis et votre pièce d'identité, eux, sont déjà au dossier de votre compte : ils ne vous sont pas redemandés à chaque déclaration.",
  },
];
