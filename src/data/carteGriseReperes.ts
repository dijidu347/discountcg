// Les repères factuels du changement de titulaire.
//
// C'est la démarche principale du site, et sa page est l'une des quatorze
// indexées : 2 006 impressions pour SIX clics, en position 16,1. Son contenu
// est correct — 1 251 mots, le Cerfa 13750 en téléchargement, huit questions —
// mais il lui manque ce qui fait échouer les dossiers dans la vraie vie.
//
// Car la demande ne bloque presque jamais sur le formulaire : elle bloque sur
// ce que l'acheteur n'a pas réclamé au vendeur le jour de la vente. Une carte
// grise mal barrée, un code de cession jamais transmis, un contrôle technique
// périmé de trois jours — et le dossier s'arrête, souvent des semaines après,
// quand le vendeur est devenu injoignable.
//
// D'où un tableau de la remise des clés, avec pour chaque pièce ce qui se
// passe si elle manque. C'est la seule chose que cette page peut dire et
// qu'aucune page de formulaire ne dit.

export interface PieceRemise {
  piece: string;
  precision: string;
  siElleManque: string;
}

/** Ce que l'acheteur doit repartir avec, le jour de la vente. */
export const A_RECLAMER_AU_VENDEUR: PieceRemise[] = [
  {
    piece: "La carte grise barrée",
    precision:
      "Barrée en diagonale, avec la mention « vendu le », la date ET l'heure, et la signature du vendeur",
    siElleManque: "Aucune demande n'est possible : c'est la pièce qui prouve la cession",
  },
  {
    piece: "Le certificat de cession, Cerfa 15776",
    precision: "Rempli et signé par les deux parties, un exemplaire pour chacun",
    siElleManque: "Vous n'avez aucune preuve de la date d'achat, celle qui fait courir votre mois",
  },
  {
    piece: "Le code de cession",
    precision:
      "Cinq caractères, que le vendeur reçoit en déclarant la vente — il doit vous les transmettre",
    siElleManque: "La demande ne peut pas aboutir tant que le vendeur n'a pas déclaré",
  },
  {
    piece: "Le certificat de situation administrative",
    precision: "De moins de quinze jours, gratuit — à exiger AVANT de payer, pas après",
    siElleManque: "Vous découvrez trop tard un gage, une opposition, une saisie ou un vol",
  },
  {
    piece: "Le contrôle technique",
    precision: "De moins de six mois le jour de la vente, pour un véhicule de plus de quatre ans",
    siElleManque: "La demande est refusée, et c'est à vous de le faire repasser",
  },
];

export const REPERES_CARTE_GRISE = [
  {
    titre: "La date doit être la même sur les deux documents",
    texte:
      "C'est le premier point que vérifie le SIV, et la cause de refus la plus bête : la date portée sur la carte grise barrée doit correspondre exactement à celle du certificat de cession. Heure comprise. Un écart d'un jour entre les deux suffit à faire rejeter le dossier, et il faut alors retrouver le vendeur pour qu'il refasse les documents.",
  },
  {
    titre: "Un mois, puis 135 €",
    texte:
      "Vous disposez d'un mois à compter de la date d'achat pour faire établir la carte grise à votre nom. Au-delà, c'est une amende forfaitaire de 135 €, qui peut être portée à 750 €. Et tant que la démarche n'est pas faite, les contraventions partent chez l'ancien propriétaire — qui vous désignera, avec un temps de retard.",
  },
  {
    titre: "Vous roulez dès la validation",
    texte:
      "Le certificat provisoire d'immatriculation vous est envoyé par courriel dès que le dossier est accepté, et vous autorise à circuler un mois en attendant le titre définitif, qui arrive par lettre suivie. Vous n'avez donc pas à attendre la carte grise pour prendre le volant — à condition d'être assuré, ce qui se fait dès l'achat.",
  },
  {
    titre: "Ce que vous payez, et à qui",
    texte:
      "La taxe régionale, c'est la puissance fiscale de la case P.6 multipliée par le tarif de votre département — de 30 € à Mayotte à 68,95 € en Île-de-France. S'y ajoutent 11 € de taxe fixe et 2,76 € de redevance d'acheminement. Tout cela part à l'État et aux collectivités. Nos frais de dossier, 30 € pour un particulier et 20 € pour un professionnel, sont la seule part qui nous revient — et la seule qui se compare d'un prestataire à l'autre.",
  },
  {
    titre: "Le véhicule a plus de dix ans",
    texte:
      "La taxe régionale est alors divisée par deux, automatiquement, à partir du dixième anniversaire de la première mise en circulation. Sur un 6 CV dans le Rhône, elle passe de 258 € à 129 €. Vous n'avez rien à demander : la date figure sur la carte grise, et le calcul s'applique seul.",
  },
];
