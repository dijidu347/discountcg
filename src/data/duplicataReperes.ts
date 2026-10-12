// Les repères factuels du duplicata de carte grise.
//
// Cette page fait partie des dix qui n'ont jamais eu UNE SEULE impression en
// seize mois. Elle est pourtant bien maillée — 129 liens entrants — et son
// contenu est juste. Ce qui lui manque, c'est d'être autre chose qu'une page
// de gabarit : la même structure que les six autres démarches invisibles,
// pièces / étapes / délai / tarif, sans rien qui lui soit propre.
//
// « Duplicata carte grise », « carte grise perdue », « carte grise volée »
// sont des requêtes nationales à très gros volume. Ce qui les distingue, c'est
// que le premier geste n'est pas le même selon le cas — et c'est précisément
// ce que la page ne montrait pas.

export interface CasPerte {
  cas: string;
  premierGeste: string;
  piece: string;
  ou: string;
}

/** Trois situations, trois premiers gestes différents. */
export const CAS_DUPLICATA: CasPerte[] = [
  {
    cas: "Carte grise perdue",
    premierGeste: "Une déclaration de perte sur l'honneur suffit",
    piece: "Déclaration de perte",
    ou: "Vous la rédigez vous-même, ou elle se fait en ligne lors de la demande",
  },
  {
    cas: "Carte grise volée",
    premierGeste: "Déposer plainte, avant toute demande",
    piece: "Récépissé de dépôt de plainte",
    ou: "Commissariat ou brigade de gendarmerie",
  },
  {
    cas: "Carte grise détériorée ou illisible",
    premierGeste: "Conserver le document abîmé",
    piece: "L'ancienne carte grise, même en mauvais état",
    ou: "À joindre au dossier : rien d'autre à déclarer",
  },
];

export const REPERES_DUPLICATA = [
  {
    titre: "13,76 € de taxes, sans taxe régionale",
    texte:
      "Un duplicata ne crée pas de nouveau droit sur le véhicule : il remplace un titre perdu. La taxe régionale n'est donc pas due, quelle que soit la puissance du véhicule et quel que soit le département. Il reste la taxe fixe de gestion de 11 € et la redevance d'acheminement de 2,76 €, auxquelles s'ajoutent nos frais de dossier. Un duplicata sur un gros véhicule coûte exactement le même prix que sur une petite citadine.",
  },
  {
    titre: "Vous roulez dès la validation, pas à la réception",
    texte:
      "Le certificat provisoire d'immatriculation vous est envoyé par courriel dès que le dossier est validé. Il vous autorise à circuler un mois, le temps que le duplicata arrive par lettre suivie — comptez trois à cinq jours. Vous n'êtes donc jamais immobilisé : c'est le point que les gens ignorent le plus souvent, et qui les fait attendre pour rien.",
  },
  {
    titre: "Même numéro d'immatriculation, nouveau numéro de formule",
    texte:
      "La plaque ne change pas : le numéro est attribué à vie au véhicule. Ce qui change est le numéro de formule, en haut à droite du certificat — celui qui sert à authentifier le document. L'ancien est invalidé dans le fichier national au moment où le duplicata est édité.",
  },
  {
    titre: "Si vous retrouvez l'ancienne après coup",
    texte:
      "Elle ne vaut plus rien. L'original est annulé automatiquement dès l'émission du duplicata, et seul le nouveau document fait foi. Détruisez l'ancien : le présenter lors d'une vente ou d'un contrôle reviendrait à présenter un titre invalide.",
  },
  {
    titre: "Un duplicata se vend comme un original",
    texte:
      "Il a exactement la même valeur juridique. Vous pouvez vendre le véhicule en barrant le duplicata comme vous auriez barré l'original, et l'acheteur fera son changement de titulaire normalement. Aucune mention particulière n'apparaît sur sa future carte grise.",
  },
  {
    titre: "Qui peut le demander",
    texte:
      "Le titulaire inscrit sur la carte grise, ou une personne qu'il mandate. Un acheteur ne peut pas demander le duplicata d'un véhicule qu'il vient d'acquérir : c'est au vendeur de le faire avant la vente, puisque c'est son nom qui figure sur le titre. Un héritier, lui, passe par la démarche de succession.",
  },
];
