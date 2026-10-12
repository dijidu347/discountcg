// Les repères factuels de la carte grise après un décès.
//
// 903 impressions sur seize mois pour UN clic, en positions 15 à 30, réparties
// sur cinquante-quatre requêtes. Le vocabulaire de la page est le bon — « décès »
// y figure trente-trois fois, c'est bien le mot que les gens tapent. Ce qui
// manque est ailleurs.
//
// Deux des requêtes portent explicitement sur le prix : « prix changement de
// nom carte grise suite décès » (66 impressions, 15e) et « carte grise
// succession prix » (19 impressions, 9e). Or la réponse est remarquable et
// quasi invisible sur la page : le conjoint ou le partenaire de PACS survivant
// ne paie PAS la taxe régionale. Sur un 6 CV en Île-de-France, la carte grise
// passe de 427,46 € à 13,76 €. Le mot « conjoint » apparaissait une fois dans
// toute la page, et « 11 € » pas du tout.
//
// Les montants ci-dessous sont calculés sur les tarifs de departementsTarifs.ts
// — 43 € le cheval fiscal en Auvergne-Rhône-Alpes, 68,95 € en Île-de-France —
// plus la taxe fixe de 11 € et la redevance d'acheminement de 2,76 €.

export interface LigneHeritier {
  qui: string;
  taxeRegionale: string;
  rhone: string;
  idf: string;
}

export interface Preuve {
  situation: string;
  piece: string;
  ou: string;
}

/** Ce que chaque héritier paie réellement, sur un 6 CV. */
export const SELON_L_HERITIER: LigneHeritier[] = [
  {
    qui: "Époux ou partenaire de PACS survivant",
    taxeRegionale: "Exonérée",
    rhone: "13,76 €",
    idf: "13,76 €",
  },
  {
    qui: "Tout autre héritier : enfant, frère, parent",
    taxeRegionale: "Due au tarif normal",
    rhone: "271,76 €",
    idf: "427,46 €",
  },
  {
    qui: "Tout autre héritier, véhicule de plus de dix ans",
    taxeRegionale: "Réduite de moitié",
    rhone: "142,76 €",
    idf: "220,61 €",
  },
];

/** Comment prouver qu'on est héritier, selon la situation. */
export const PREUVES_QUALITE: Preuve[] = [
  {
    situation: "Succession simple, sans testament ni contrat de mariage",
    piece: "Certificat d'hérédité, ou attestation signée par tous les héritiers",
    ou: "La mairie du domicile du défunt, ou de l'un des héritiers",
  },
  {
    situation: "Testament, contrat de mariage, donation entre époux",
    piece: "Attestation notariale, ou acte de notoriété",
    ou: "Le notaire chargé de la succession",
  },
  {
    situation: "Plusieurs héritiers, et un seul garde le véhicule",
    piece: "Accord écrit des autres héritiers, qui renoncent au véhicule",
    ou: "Rédigé entre vous, à joindre au dossier",
  },
];

/** Ce que la page ne disait nulle part. */
export const REPERES_SUCCESSION = [
  {
    titre: "L'exonération du conjoint survivant",
    texte:
      "L'article L. 421-52 du code des impositions sur les biens et services exonère de taxe régionale la délivrance d'un certificat d'immatriculation consécutive au décès de l'un des époux ou partenaires de PACS. Il ne reste alors que la taxe fixe de 11 € et la redevance d'acheminement de 2,76 €, soit 13,76 € quel que soit le département et quelle que soit la puissance du véhicule. L'exonération ne vaut que pour l'époux ou le partenaire : un enfant qui hérite paie la taxe régionale au tarif plein.",
  },
  {
    titre: "Le délai, qui ne dit pas ce qu'on croit",
    texte:
      "Aucun délai ne vous oblige à mettre la carte grise à votre nom si vous gardez le véhicule. Les trois mois dont tout le monde parle concernent la revente : l'article 12 de l'arrêté du 9 février 2009 permet de vendre sans immatriculer au nom de l'héritier si la vente intervient dans les trois mois du décès, ou si le véhicule n'a pas circulé depuis. Au-delà, et si le véhicule a roulé, il faut l'immatriculer à votre nom avant de pouvoir le céder.",
  },
  {
    titre: "Si vous ne gardez pas le véhicule",
    texte:
      "Vous pouvez souvent le vendre sans jamais le mettre à votre nom, et c'est une économie que peu de gens connaissent : aucune carte grise n'est éditée, donc aucune taxe régionale n'est due. L'article 12 de l'arrêté du 9 février 2009 l'autorise dans deux cas — la vente intervient dans les trois mois du décès, ou le véhicule n'a pas circulé depuis. Vous joignez alors la preuve de votre qualité d'héritier et remplissez le certificat de cession à la place du défunt ; l'acheteur fait établir la carte grise à son nom.",
  },
  {
    titre: "L'assurance pendant ce temps",
    texte:
      "La plupart des assureurs acceptent de couvrir un véhicule hérité à titre provisoire, sur présentation de l'acte de décès et du certificat d'hérédité. Prévenez l'assureur dès que possible : c'est lui qui dira à quelles conditions, et la couverture ne devient complète qu'une fois la carte grise régularisée.",
  },
];
