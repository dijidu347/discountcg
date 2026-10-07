// Les reperes factuels de la declaration de cession.
//
// Sortis du composant pour que le prerendu les lise : qui fait quoi dans quel
// delai, et le contenu du Cerfa 15776 case par case, sont ce que cherche
// vraiment quelqu'un qui tape « certificat de cession ». Ils etaient rendus
// par React, donc absents du HTML servi.

export interface LigneQuiFaitQuoi {
  qui: string;
  action: string;
  quand: string;
  sinon: string;
}

export interface CaseCerfa {
  repere: string;
  contenu: string;
}

export const QUI_FAIT_QUOI: LigneQuiFaitQuoi[] = [
  {
    qui: "Le vendeur",
    action: "Barrer la carte grise, porter la mention « vendu le », la date et l'heure, puis signer",
    quand: "Le jour de la vente",
    sinon: "L'acheteur ne peut pas faire sa carte grise",
  },
  {
    qui: "Le vendeur",
    action: "Déclarer la cession et remettre le code de cession à l'acheteur",
    quand: "Dans les 15 jours",
    sinon: "Il reste responsable des infractions commises avec le véhicule",
  },
  {
    qui: "L'acheteur",
    action: "Demander la carte grise à son nom",
    quand: "Dans les 30 jours",
    sinon: "Amende de 135 €",
  },
];

export const CASES_CERFA: CaseCerfa[] = [
  { repere: "Véhicule", contenu: "Immatriculation, date de première mise en circulation, marque et numéro d'identification (VIN), recopiés de la carte grise." },
  { repere: "Ancien propriétaire", contenu: "Nom, prénom, adresse du vendeur. Pour une société, sa raison sociale et son SIRET." },
  { repere: "Date et heure de cession", contenu: "Le moment exact où la vente est conclue. C'est lui qui fait basculer la responsabilité, d'où l'heure." },
  { repere: "Nouveau propriétaire", contenu: "Identité et adresse de l'acheteur. Une faute d'orthographe ici bloque sa demande de carte grise." },
  { repere: "Signatures", contenu: "Les deux parties signent. Une société ajoute son cachet." },
];
