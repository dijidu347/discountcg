// Les repères factuels de la fiche d'identification du véhicule.
//
// 532 impressions sur seize mois pour DEUX clics, en position 24,7, réparties
// sur 46 requêtes. La page est honnête et bien écrite — elle dit même que le
// document est gratuit sur l'ANTS, ce que peu de services avouent. Ce qui lui
// manque n'est pas du contenu mais de la structure : tout est en prose, dans
// sept questions-réponses.
//
// Deux choses s'en dégagent, et ce sont celles que les requêtes cherchent :
//
//   · QUAND elle sert. Les quatre cas d'usage tiennent dans une seule réponse,
//     noyés. Or c'est la question : « j'ai perdu ma carte grise, est-ce que
//     c'est ça qu'il me faut ? »
//   · COMMENT l'obtenir. « fiv ants » sort en 11e position avec 52
//     impressions : les gens cherchent la marche à suivre sur le site de
//     l'État, et la page ne la donne qu'en une phrase.
//
// Et l'abréviation « FIV » pèse 110 impressions à elle seule — elle n'était ni
// dans le titre, ni dans le H1.

export interface CasFiv {
  situation: string;
  pourquoi: string;
}

export interface Confusion {
  document: string;
  dit: string;
  neDitPas: string;
}

/** Les quatre cas où elle sert vraiment. */
export const CAS_FIV: CasFiv[] = [
  {
    situation: "Passer le contrôle technique sans carte grise",
    pourquoi: "Le centre exige un document d'identification du véhicule : la fiche en tient lieu",
  },
  {
    situation: "Appuyer une demande de duplicata après une perte ou un vol",
    pourquoi: "Elle atteste les caractéristiques enregistrées, quand le titre a disparu",
  },
  {
    situation: "Exporter un véhicule dont le certificat a été retiré",
    pourquoi: "Typiquement après un accident : le titre est retenu, le véhicule part à l'étranger",
  },
  {
    situation: "Vendre aux enchères ou par le service des domaines",
    pourquoi: "L'acquéreur doit pouvoir identifier le véhicule sans carte grise à l'appui",
  },
];

/** Ce qu'on lui prête à tort, et le document qui le fait vraiment. */
export const NE_PAS_CONFONDRE: Confusion[] = [
  {
    document: "La fiche d'identification",
    dit: "Les caractéristiques techniques enregistrées au fichier national",
    neDitPas: "Rien sur la situation du véhicule, et elle n'autorise pas à rouler",
  },
  {
    document: "La carte grise",
    dit: "Le titre lui-même : elle identifie le véhicule ET autorise sa circulation",
    neDitPas: "Rien sur les gages ou les oppositions",
  },
  {
    document: "Le certificat de situation administrative",
    dit: "Gage, opposition, saisie, vol : tout ce qui bloquerait une vente",
    neDitPas: "Rien sur les caractéristiques techniques",
  },
];

export const REPERES_FIV = [
  {
    titre: "Elle est gratuite sur le site de l'État",
    texte:
      "Sur l'ANTS, avec un compte FranceConnect : vous choisissez la démarche « Obtenir une fiche d'identification de véhicule », vous indiquez le motif, et vous téléchargez le document en quelques minutes. Les services qui la facturent, le nôtre compris, vendent le fait de s'en occuper — ce qui n'a d'intérêt que si vous n'avez pas FranceConnect, ou si vous n'êtes pas le titulaire et devez passer par un mandat.",
  },
  {
    titre: "Seul le titulaire peut la demander",
    texte:
      "Le nom inscrit sur la carte grise, ou quelqu'un qu'il mandate — personne d'autre. Un acheteur, un héritier ou un garage ne peuvent pas la demander en leur nom propre. C'est précisément pour cela qu'un professionnel habilité au SIV peut la faire à votre place : il agit sous votre mandat, pas à votre place.",
  },
  {
    titre: "Elle n'autorise pas à circuler",
    texte:
      "C'est la confusion la plus fréquente, et la plus coûteuse. Ce n'est ni une carte grise ni un certificat provisoire d'immatriculation. Rouler avec elle seule revient à rouler sans certificat d'immatriculation : 135 € d'amende. Si vous avez besoin de circuler, c'est un duplicata qu'il vous faut, pas une fiche.",
  },
  {
    titre: "Elle ne dit rien d'un éventuel gage",
    texte:
      "Ni gage, ni opposition, ni saisie, ni déclaration de vol : la fiche décrit le véhicule, pas sa situation. Pour cela il faut le certificat de situation administrative, dit « non-gage », délivré gratuitement par le ministère de l'Intérieur et valable quinze jours.",
  },
  {
    titre: "Pour vendre, elle ne sert à rien",
    texte:
      "Une vente ordinaire demande la carte grise barrée, le certificat de cession Cerfa 15776, un certificat de situation administrative de moins de quinze jours et, au-delà de quatre ans, un contrôle technique de moins de six mois. La fiche n'intervient que si la carte grise a disparu — et dans ce cas, c'est le duplicata qu'il faut viser.",
  },
];
