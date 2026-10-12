// Les repères factuels du changement d'adresse sur la carte grise.
//
// Une des dix pages du site sans aucune impression en seize mois. Bien
// maillée, contenu juste, mais page de gabarit : pièces, étapes, délai, tarif.
//
// « Changement d'adresse carte grise » est une requête nationale énorme, et ce
// qui la distingue n'y figurait pas : ce qu'on reçoit et ce qu'on paie ne
// dépendent pas du déménagement mais du NUMÉRO qu'on a déjà. Trois cas, trois
// réponses — et le troisième réserve une mauvaise surprise que la page ne
// mentionnait nulle part.
//
// La FAQ affirmait : « le numéro d'immatriculation est attribué à vie au
// véhicule et ne change jamais, quel que soit le nombre de déménagements ».
// C'est vrai d'une plaque SIV, et seulement d'elle. Un véhicule encore sous
// l'ancien numéro départemental — 123 ABC 75 — est basculé d'office dans le
// SIV au premier changement d'adresse : il reçoit un numéro tout neuf, et il
// faut refaire les plaques.

export interface CasAdresse {
  situation: string;
  recoit: string;
  taxes: string;
  aPrevoir: string;
}

export const CAS_ADRESSE: CasAdresse[] = [
  {
    situation: "Plaque SIV (AA-123-BB), du 1er au 3e changement",
    recoit: "Une étiquette autocollante à coller en case C.3",
    taxes: "Aucune",
    aPrevoir: "Rien : la carte grise d'origine reste valable",
  },
  {
    situation: "Plaque SIV, à partir du 4e changement",
    recoit: "Une nouvelle carte grise, à la nouvelle adresse",
    taxes: "2,76 €",
    aPrevoir: "Rien : même numéro, mêmes plaques",
  },
  {
    situation: "Ancienne plaque (123 ABC 75), quel que soit le rang",
    recoit: "Une nouvelle carte grise ET un nouveau numéro SIV",
    taxes: "2,76 €",
    aPrevoir: "Refaire les deux plaques : le numéro change",
  },
];

export const REPERES_ADRESSE = [
  {
    titre: "Déménager dans une région plus chère ne coûte rien de plus",
    texte:
      "C'est l'inquiétude la plus fréquente, et elle n'a pas lieu d'être : le changement d'adresse est exonéré de taxe régionale ET de taxe fixe de gestion. Passer de l'Auvergne-Rhône-Alpes à 43 € le cheval fiscal à l'Île-de-France à 68,95 € ne vous coûte donc pas un centime de taxe supplémentaire. Le tarif du nouveau département ne s'appliquera qu'à votre prochaine vraie carte grise — un changement de titulaire, par exemple.",
  },
  {
    titre: "Trente jours, et 135 € si on les dépasse",
    texte:
      "L'adresse doit être mise à jour dans le mois qui suit le déménagement. Au-delà, c'est une contravention de quatrième classe, 135 € d'amende forfaitaire. Le vrai risque est pourtant ailleurs : tant que l'adresse est fausse, les courriers liés au véhicule — avis de contravention, rappels, convocations au contrôle technique — partent à l'ancienne, et c'est vous qui en répondez.",
  },
  {
    titre: "Si votre véhicule porte encore un numéro départemental",
    texte:
      "Un numéro de la forme 123 ABC 75 relève de l'ancien fichier national. Le changement d'adresse déclenche alors sa conversion d'office dans le SIV : vous recevez une carte grise portant un numéro entièrement nouveau, au format AA-123-BB, et il faut faire refaire les deux plaques à vos frais. Ce n'est pas une option, et ça ne se produit qu'une fois.",
  },
  {
    titre: "Un véhicule, une démarche",
    texte:
      "Il n'existe pas de changement d'adresse groupé : chaque certificat d'immatriculation se met à jour séparément, y compris pour deux véhicules du même foyer. Si vous en avez trois, ce sont trois démarches — nous les enchaînons sans que vous ressaisissiez vos informations.",
  },
  {
    titre: "Où coller l'étiquette",
    texte:
      "Dans la case C.3 de la carte grise, l'emplacement réservé à l'adresse du titulaire, en bas du document. Elle se colle par-dessus l'ancienne adresse, sans recouvrir les autres rubriques. Une carte grise peut en porter trois : à la quatrième, un nouveau titre est édité.",
  },
  {
    titre: "Véhicule en location longue durée ou en crédit-bail",
    texte:
      "C'est une autre démarche : sur un véhicule en LOA ou LLD, le titulaire de la carte grise est le loueur, et c'est le locataire qui apparaît en seconde ligne. Son déménagement se déclare séparément, avec le contrat de location à l'appui.",
  },
];
