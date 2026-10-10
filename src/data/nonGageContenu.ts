// Le contenu du certificat de non-gage, hors du JSX.
//
// Il y vivait, donc le prérendu ne pouvait pas l'atteindre : la page servait
// 283 mots aux robots là où le visiteur en lit plus de mille. Les six
// rubriques sont l'apport propre de cette page — nulle part ailleurs on ne
// trouve ce que chacune veut dire — et la FAQ alimente le balisage
// FAQPage. Déplacés ici, ils servent à la fois la page et le HTML prérendu,
// sans être écrits deux fois.

export const RUBRIQUES = [
  {
    titre: "Opposition au transfert du certificat d'immatriculation (OTCI)",
    vierge: "Aucune",
    sens: "Une administration bloque le changement de titulaire : amendes impayées, expertise non levée, procédure en cours.",
  },
  {
    titre: "Opposition véhicule endommagé",
    vierge: "Aucune",
    sens: "Le véhicule a été expertisé après un accident. Il ne peut être revendu qu'une fois la procédure levée.",
  },
  {
    titre: "Déclaration valant saisie",
    vierge: "Aucune",
    sens: "Un huissier ou le Trésor public a saisi le véhicule. La vente est impossible.",
  },
  {
    titre: "Gage",
    vierge: "Aucun",
    sens: "Un organisme de crédit a financé le véhicule et garde un droit dessus. Le nom du créancier apparaît.",
  },
  {
    titre: "Immatriculation suspendue",
    vierge: "Non",
    sens: "Le certificat d'immatriculation a été suspendu : le véhicule ne peut plus circuler en l'état.",
  },
  {
    titre: "Véhicule volé",
    vierge: "Non",
    sens: "Le véhicule est déclaré volé. N'allez pas plus loin.",
  },
];

export const FAQ = [
  {
    question: "Le certificat de non-gage est-il payant ?",
    answer: "Non. Il est délivré gratuitement par le ministère de l'Intérieur, sur le site du SIV ou via Histovec. Il vous faut le numéro d'immatriculation, la date du certificat d'immatriculation et le nom du titulaire. Comptez deux minutes. Les services qui le facturent vendent le fait de s'en occuper à votre place, pas le document lui-même.",
  },
  {
    question: "Combien de temps un certificat de situation administrative est-il valable ?",
    answer: "Quinze jours. Passé ce délai, il n'est plus recevable pour une démarche d'immatriculation : la situation d'un véhicule peut changer d'un jour à l'autre. Demandez-le au moment de la vente, pas trois semaines avant.",
  },
  {
    question: "Pour quelles démarches le certificat est-il exigé ?",
    answer: "Pour une carte grise, une déclaration d'achat et une déclaration de cession. Il prouve que rien ne s'oppose au transfert du véhicule. Les autres démarches — duplicata, changement d'adresse, quitus fiscal — ne le demandent pas.",
  },
  {
    question: "Que faire si le véhicule est gagé ?",
    answer: "Un gage ne rend pas la vente impossible, mais il la complique : l'organisme de crédit garde un droit sur le véhicule tant que le financement court. Le vendeur doit solder son crédit et obtenir la mainlevée. Tant qu'elle n'est pas enregistrée, la carte grise ne pourra pas être établie au nom de l'acheteur.",
  },
  {
    question: "Un document Histovec remplace-t-il le certificat ?",
    answer: "Pas toujours. Histovec délivre deux choses : un rapport d'historique du véhicule, qui n'est pas un certificat de situation administrative, et le certificat lui-même. Seul le second conclut sur la situation administrative, rubrique par rubrique. Un rapport d'historique seul sera refusé.",
  },
  {
    question: "Qui doit demander le certificat, le vendeur ou l'acheteur ?",
    answer: "C'est au vendeur de le fournir : il est le seul à disposer des informations nécessaires pour l'obtenir, et c'est à lui de prouver que son véhicule est libre de tout obstacle. L'acheteur, lui, a tout intérêt à le lire avant de payer.",
  },
];
