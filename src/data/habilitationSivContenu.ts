// Le contenu de la page sur l'habilitation SIV, hors du JSX.
//
// Troisième page dans ce cas : elle ne servait que 439 mots aux robots, tout
// le reste étant rendu par React. Or c'est la page la plus argumentée du site
// — conditions légales sourcées à l'article R. 322-1 et à l'arrêté du
// 9 février 2009, obligations du titulaire — et c'est précisément ce qu'un
// garage cherche avant de décider s'il demande son habilitation ou s'il passe
// par un habilité.

export const BENEFICIAIRES = [
  "Professionnels du commerce de l'automobile, cyclomoteur compris",
  "Loueurs de véhicules",
  "Experts en automobile",
  "Huissiers de justice",
  "Démolisseurs, broyeurs et centres VHU agréés",
];

export const CONDITIONS = [
  {
    titre: "Être professionnel de l'automobile depuis plus d'un an",
    texte:
      "L'article R. 322-1 du code de la route réserve l'habilitation aux professionnels de l'automobile. L'activité doit être réelle : le livre de police et les factures doivent pouvoir l'attester. Les préfectures demandent un an d'activité de l'établissement avant d'examiner une demande.",
    bloquant: "Un garage de moins d'un an ne peut pas être habilité.",
  },
  {
    titre: "Avoir un bulletin n° 2 de casier judiciaire vierge",
    texte:
      "L'article 18-1 de l'arrêté du 9 février 2009 relatif aux modalités d'immatriculation des véhicules dispose qu'une personne ne peut être habilitée à transmettre dans le SIV si elle fait l'objet d'une condamnation inscrite au bulletin n° 2 de son casier judiciaire.",
    bloquant: "La condition vaut pour chaque personne qui aura accès au SIV.",
  },
];

export const OBLIGATIONS = [
  { quoi: "Signaler tout changement", detail: "Coordonnées, adresse, SIREN, dénomination sociale, coordonnées bancaires, mode d'accès : dans le mois, directement dans le SIV." },
  { quoi: "Conserver les dossiers cinq ans", detail: "En cas de cessation d'activité, les dossiers archivés sur les cinq dernières années doivent être restitués à la préfecture." },
  { quoi: "Accepter le contrôle préfectoral", detail: "Les opérations réalisées via le SIV peuvent faire l'objet d'un contrôle." },
  { quoi: "Reverser les taxes, si vous êtes agréé", detail: "L'agrément engage à percevoir les taxes puis à les reverser au Trésor public, par prélèvement ou carte bancaire." },
  { quoi: "Respecter un préavis de deux mois", detail: "L'habilitation se résilie à tout moment, par lettre recommandée au préfet, avec deux mois de préavis." },
];

export const FAQ = [
  {
    question: "Qu'est-ce que l'habilitation au SIV ?",
    answer:
      "C'est l'autorisation de télétransmettre des opérations d'immatriculation dans le Système d'Immatriculation des Véhicules, le fichier national. Elle permet à un professionnel de réaliser les démarches pour le compte de ses clients depuis un simple accès internet. Elle est délivrée par le préfet du département du siège social de l'entreprise.",
  },
  {
    question: "Quelle différence entre l'habilitation et l'agrément ?",
    answer:
      "L'habilitation, préfectorale, donne accès au SIV pour effectuer les démarches. L'agrément, délivré par l'administration des finances publiques, autorise à percevoir les taxes et la redevance sur les certificats d'immatriculation, puis à les reverser au Trésor public. L'habilitation est un préalable à l'agrément. Un professionnel habilité mais non agréé ne peut pas encaisser la taxe régionale de son client : il doit la lui faire régler séparément.",
  },
  {
    question: "Combien de temps faut-il pour obtenir l'habilitation SIV ?",
    answer:
      "Le délai dépend de la préfecture et de l'instruction de votre dossier ; il n'existe pas de délai légal unique. La condition d'un an d'activité, elle, est incompressible : elle court depuis la création de l'établissement, pas depuis le dépôt de la demande.",
  },
  {
    question: "L'habilitation SIV est-elle un droit ?",
    answer:
      "Non. Les préfectures le rappellent explicitement : l'habilitation SIV n'est pas un droit, et l'autorité préfectorale reste seule à apprécier le bien-fondé d'une demande. Un dossier complet et conforme peut donc être refusé.",
  },
  {
    question: "Faut-il un certificat numérique ?",
    answer:
      "Oui, la télétransmission dans le SIV nécessite un certificat numérique. Les préfectures conseillent d'attendre la validation de la demande avant de l'acquérir, pour ne pas l'acheter en pure perte si l'habilitation est refusée.",
  },
  {
    question: "Peut-on immatriculer pour ses clients sans être habilité ?",
    answer:
      "Oui, en passant par un professionnel qui l'est déjà : c'est alors son habilitation qui couvre la démarche, et vous n'avez aucune formalité à accomplir auprès de la préfecture, ni certificat numérique, ni obligation d'archivage. Vous payez en revanche des frais de service à chaque démarche.",
  },
];
