// Les repères factuels de la modification de carte grise.
//
// Une des dix pages du site sans aucune impression en seize mois. Son contenu
// était juste mais dispersé dans sept questions, alors que le lecteur arrive
// avec une question unique et pratique : « j'ai fait tel changement sur mon
// véhicule, qu'est-ce qu'on va me demander ? »
//
// La réponse se range en tableau, et l'écart est énorme : un boîtier E85 ou un
// attelage se justifient par un certificat remis le jour même par
// l'installateur, tandis qu'un changement de genre exige un procès-verbal de
// la DREAL qui prend deux à six semaines. C'est ce délai qui décide du
// calendrier, pas notre traitement.

export interface LigneModification {
  modification: string;
  preuve: string;
  delivrePar: string;
  delai: string;
}

export const SELON_LA_MODIFICATION: LigneModification[] = [
  {
    modification: "Passage à l'éthanol E85, par boîtier homologué",
    preuve: "Certificat de conformité du boîtier",
    delivrePar: "L'installateur agréé",
    delai: "Remis à la pose",
  },
  {
    modification: "Ajout d'un attelage de remorque",
    preuve: "Certificat d'installation",
    delivrePar: "Le professionnel qui l'a posé",
    delai: "Remis à la pose",
  },
  {
    modification: "Changement de genre — camping-car, VASP, utilitaire",
    preuve: "Procès-verbal de réception à titre isolé (RTI)",
    delivrePar: "La DREAL ou un organisme agréé",
    delai: "2 à 6 semaines",
  },
  {
    modification: "Modification technique — moteur, puissance, carrosserie",
    preuve: "Procès-verbal de réception à titre isolé (RTI)",
    delivrePar: "La DREAL ou un organisme agréé",
    delai: "2 à 6 semaines",
  },
  {
    modification: "Passage en véhicule de collection, au-delà de trente ans",
    preuve: "Attestation de datation et de caractéristiques",
    delivrePar: "La Fédération française des véhicules d'époque",
    delai: "Sur dossier",
  },
];

export const REPERES_MODIFICATION = [
  {
    titre: "Le délai qui compte n'est pas le nôtre",
    texte:
      "Une fois la preuve en main, la carte grise est mise à jour en quarante-huit heures. Mais obtenir un procès-verbal de la DREAL prend deux à six semaines selon la région et le type de transformation, et ce délai-là ne dépend ni de nous ni de vous. Lancez la réception à titre isolé en premier : c'est elle qui fixe le calendrier.",
  },
  {
    titre: "Rouler avec un véhicule modifié mais non déclaré",
    texte:
      "La carte grise doit décrire le véhicule tel qu'il est. Une transformation non mentionnée rend le certificat non conforme : le contrôle technique peut la relever, et l'assureur peut opposer la non-déclaration en cas de sinistre. C'est surtout vrai des modifications qui touchent la puissance, le genre ou la capacité de traction.",
  },
  {
    titre: "Ce que change le passage en collection",
    texte:
      "Au-delà de trente ans, l'usage « collection » dispense du contrôle technique périodique habituel et autorise une carte grise à ce titre. En contrepartie, le véhicule est soumis à des restrictions de circulation dans certaines zones, et il ne peut plus servir à un usage professionnel. C'est un choix, pas une formalité.",
  },
  {
    titre: "L'E85 et la taxe régionale",
    texte:
      "Installer un boîtier homologué change la motorisation inscrite sur le titre. L'abattement de taxe régionale dont bénéficiaient autrefois ces véhicules n'est plus national : depuis la loi de finances pour 2025, chaque région décide. Vérifiez donc ce que la vôtre a voté avant de compter sur une réduction — notre simulateur applique la règle en vigueur.",
  },
];
