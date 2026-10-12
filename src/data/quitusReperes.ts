// Les repères factuels du quitus fiscal et du certificat 846 A.
//
// 2 374 impressions sur seize mois pour HUIT clics — mais en positions 9 à 13,
// c'est-à-dire déjà en bas de la première page. C'est la seule famille du site
// où la visibilité est acquise et où seul le clic manque.
//
// Un chiffre explique la page : sur ces 2 374 impressions, 2 032 portent sur le
// 846 A — « certificat 846 a » à lui seul en pèse 1 209 — et 342 seulement sur
// le quitus. Or le titre de la page commence par « Quitus fiscal » et ne
// mentionne le 846 A qu'en second. Le terme cherché n'est pas le premier lu.
//
// Ce n'est pas une question d'accroche mais de correspondance : on inverse
// l'ordre pour que le mot tapé vienne d'abord.
//
// Deuxième constat, commercial celui-là. Le 846 A est délivré par la douane :
// nous ne le vendons pas et nous ne le vendrons jamais. Mais celui qui le
// cherche importe un véhicule, et il aura besoin ensuite d'un CPI WW puis
// d'une immatriculation définitive — que nous faisons l'un et l'autre. La page
// doit donc dire la vérité sur le document, et montrer la suite.

export interface CasOrigine {
  origine: string;
  justificatif: string;
  delivrePar: string;
  tva: string;
}

export interface EtapeImport {
  etape: string;
  quand: string;
  chezQui: string;
}

/** D'où vient le véhicule décide du document. C'est toute la confusion. */
export const SELON_L_ORIGINE: CasOrigine[] = [
  {
    origine: "Allemagne, Belgique, Espagne, Italie… un pays de l'Union européenne",
    justificatif: "Quitus fiscal, dit aussi certificat fiscal",
    delivrePar: "Le service des impôts de votre département",
    tva: "Due en France seulement si le véhicule est « neuf » au sens européen",
  },
  {
    origine: "Royaume-Uni depuis le Brexit, Suisse, États-Unis, Japon… un pays tiers",
    justificatif: "Certificat de dédouanement n° 846 A",
    delivrePar: "Le bureau de douane, après les formalités douanières",
    tva: "TVA et droits de douane réglés au moment du dédouanement",
  },
  {
    origine: "Nord, Pas-de-Calais, Moselle, Bas-Rhin : un achat dans l'Union européenne",
    justificatif: "Aucune demande séparée depuis septembre 2023",
    delivrePar: "La demande d'immatriculation vaut demande de quitus, par téléprocédure ANTS",
    tva: "Réglée dans la même procédure",
  },
];

/** Ce qui vient après, et que la page ne montrait pas. */
export const PARCOURS_IMPORT: EtapeImport[] = [
  {
    etape: "Obtenir le justificatif fiscal : quitus ou 846 A selon l'origine",
    quand: "Après la livraison du véhicule",
    chezQui: "Impôts ou douane — nous constituons le dossier du quitus",
  },
  {
    etape: "Demander le certificat provisoire d'immatriculation WW",
    quand: "Sans attendre le quitus : la preuve qu'il a été demandé suffit",
    chezQui: "Nous — vous roulez ensuite quatre mois sous plaque WW",
  },
  {
    etape: "Faire établir la carte grise définitive",
    quand: "Dès que le dossier est complet, avant l'expiration du WW",
    chezQui: "Nous — frais de dossier, plus la taxe régionale de votre département",
  },
];

/** Les points qui débloquent un dossier d'import, et qu'on cherche. */
export const REPERES_QUITUS = [
  {
    titre: "Le 846 A n'est pas un quitus fiscal, et il ne s'achète pas",
    texte:
      "C'est le certificat de dédouanement, délivré par la douane après le paiement des droits et taxes dus. Il concerne les véhicules venant d'un pays hors Union européenne. Aucun intermédiaire ne peut l'obtenir à votre place : vous passez par un bureau de douane, qui vous remet la quittance, un exemplaire de la déclaration et le certificat n° 846 A. Le quitus fiscal, lui, vient des services des impôts et ne concerne que les achats dans l'Union européenne.",
  },
  {
    titre: "Quatre mois pour circuler sous immatriculation étrangère",
    texte:
      "Le 846 A vous autorise à rouler sous la plaque d'origine pendant quatre mois à compter de sa délivrance. C'est le délai dont vous disposez pour réunir le dossier d'immatriculation française. Au-delà, il faut une immatriculation provisoire WW, ou la carte grise définitive.",
  },
  {
    titre: "Neuf ou occasion : ce sont les kilomètres et les mois qui tranchent",
    texte:
      "Un véhicule de moins de six mois, ou de moins de 6 000 kilomètres, est considéré comme neuf au sens européen — même s'il a déjà servi, même s'il a déjà été immatriculé. La TVA française de 20 % est alors exigible en France. Au-delà de ces deux seuils il est d'occasion, et la TVA n'est pas due ici si elle a été acquittée dans le pays d'origine.",
  },
  {
    titre: "Vous pouvez rouler pendant que le quitus s'instruit",
    texte:
      "Le justificatif fiscal n'a pas à être fourni au moment de la demande de WW, à condition de produire la preuve qu'il a été demandé. C'est le point qui débloque le plus de dossiers : le délai des impôts va de quelques jours à plusieurs semaines, et il n'immobilise pas le véhicule.",
  },
  {
    titre: "Le quitus est gratuit, et vous pouvez le demander vous-même",
    texte:
      "La demande auprès des services des impôts ne coûte rien. Elle se fait par courriel au service du département, avec le formulaire n° 1993-PART-D-SD pour un particulier, n° 1993-PRO-D-SD pour un professionnel, et la TVA éventuellement due se règle exclusivement par virement. Nos frais de dossier couvrent la constitution du dossier et le suivi, pas le document lui-même.",
  },
];
