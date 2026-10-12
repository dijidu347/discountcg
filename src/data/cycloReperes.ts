// Les repères factuels de l'immatriculation d'un cyclomoteur.
//
// 744 impressions sur seize mois pour ZÉRO clic, réparties sur 83 requêtes, en
// positions 38 à 56. C'est le pire rendement du site, et de loin.
//
// La page disait l'essentiel mais ne portait aucun des deux faits qui
// distinguent vraiment un cyclomoteur, et qui sont ceux qu'on cherche :
//
//   1. Son immatriculation coûte 11 € de taxes, et 11 € partout en France.
//      Il est exonéré de taxe régionale ET de redevance d'acheminement — le
//      seul véhicule dans ce cas. La FAQ annonçait 11 € + 2,76 €, ce qui
//      contredisait le simulateur du site lui-même et surévaluait le prix.
//   2. Le vrai sujet n'est pas la démarche mais le certificat de conformité :
//      « certificat de conformité 50cc » et « certificat de conformité scooter »
//      sortent en positions 10 et 14, bien mieux que la page elle-même. Pour
//      une mobylette des années 1970 dont le constructeur a disparu, c'est le
//      point de blocage — et la fiche d'identification du véhicule est la
//      sortie, ce que la page ne disait nulle part.

export interface CasCyclo {
  situation: string;
  piecePrincipale: string;
  difficulte: string;
}

/** Les trois situations, et celle qui bloque. */
export const CAS_CYCLO: CasCyclo[] = [
  {
    situation: "Cyclomoteur neuf, acheté chez un concessionnaire",
    piecePrincipale: "Certificat de conformité remis avec le véhicule",
    difficulte: "Aucune : le vendeur fournit tout",
  },
  {
    situation: "Cyclomoteur d'occasion déjà immatriculé depuis 2004",
    piecePrincipale: "Carte grise barrée et signée par le vendeur, plus le certificat de cession",
    difficulte: "Aucune : c'est un changement de titulaire ordinaire",
  },
  {
    situation: "Mobylette ou scooter ancien, jamais immatriculé",
    piecePrincipale: "Certificat de conformité du constructeur, ou à défaut une fiche d'identification du véhicule",
    difficulte: "C'est le cas qui bloque : voir plus bas",
  },
];

export const REPERES_CYCLO = [
  {
    titre: "11 € de taxes, et le même prix dans toute la France",
    texte:
      "Un cyclomoteur est exonéré de taxe régionale et de redevance d'acheminement — il est le seul véhicule à l'être des deux. Il ne reste que la taxe fixe de gestion, 11 €, due depuis 2021. Le tarif du cheval fiscal de votre département n'entre donc pas en jeu : la carte grise d'un scooter 50 cm³ coûte 11 € de taxes à Paris comme à Mayotte, auxquels s'ajoutent nos frais de dossier.",
  },
  {
    titre: "Quand le constructeur n'existe plus : la fiche d'identification",
    texte:
      "C'est le blocage classique d'une mobylette des années 1970 ou 1980. Le certificat de conformité s'obtient auprès du constructeur ou de son représentant en France — mais Motobécane, Peugeot cycles, MBK ont changé de mains ou disparu, et beaucoup d'archives avec. Dans ce cas, la fiche d'identification du véhicule prend le relais : elle est établie à partir des caractéristiques relevées sur l'engin et permet de monter le dossier sans certificat de conformité.",
  },
  {
    titre: "Depuis quand c'est obligatoire",
    texte:
      "Tous les cyclomoteurs neufs vendus à partir du 1er juillet 2004 sont immatriculés d'origine. Ceux qui circulaient avant cette date devaient l'être au plus tard le 31 décembre 2010. Aujourd'hui, un cyclomoteur sans plaque n'a plus de régime dérogatoire : rouler sans immatriculation expose à une amende de 135 €, et l'assureur peut refuser sa garantie en cas de sinistre.",
  },
  {
    titre: "La plaque et le numéro",
    texte:
      "Le numéro est au format SIV, celui des voitures : deux lettres, trois chiffres, deux lettres. Il est attribué à vie au véhicule et ne change pas lors d'une revente. La plaque doit être fixée à l'arrière, et son format est réduit pour les deux-roues.",
  },
  {
    titre: "Le permis, et ce qui ne s'immatricule pas",
    texte:
      "Un cyclomoteur de 50 cm³ se conduit avec le BSR, devenu permis AM, pour qui est né après le 1er janvier 1988. Au-delà de 50 cm³ ou de 45 km/h, le véhicule n'est plus un cyclomoteur mais une motocyclette légère : il relève d'un autre genre, d'un autre permis, et sa carte grise redevient payante au tarif du cheval fiscal, à moitié prix.",
  },
];
