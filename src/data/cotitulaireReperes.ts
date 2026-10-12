// Les repères factuels du cotitulaire.
//
// Une des dix pages du site sans aucune impression en seize mois. Page de
// gabarit comme les autres — alors qu'elle porte un fait remarquable, déjà
// écrit dans son paragraphe « Tarif » mais noyé dedans : le nom qu'on ajoute
// ou qu'on retire décide du prix, et l'écart va de 13,76 € à plusieurs
// centaines d'euros.
//
// L'article L. 421-52 du code des impositions sur les biens et services
// exonère de taxe régionale l'ajout ou le retrait du nom d'un époux ou d'un
// partenaire de PACS — mariage, divorce, PACS, dissolution, décès — même
// lorsqu'il y a bien changement de propriétaire. Ajouter un enfant ou un tiers
// reste taxé au tarif normal.

export interface LigneCotitulaire {
  qui: string;
  taxeRegionale: string;
  total6cv: string;
}

/** Ce que coûte l'opération selon le lien avec la personne concernée. */
export const SELON_LE_LIEN: LigneCotitulaire[] = [
  {
    qui: "Époux ou partenaire de PACS — mariage, divorce, PACS, dissolution, décès",
    taxeRegionale: "Exonérée",
    total6cv: "13,76 €",
  },
  {
    qui: "Enfant, parent, ami, associé — toute autre personne",
    taxeRegionale: "Due au tarif normal du département",
    total6cv: "271,76 € dans le Rhône, 427,46 € en Île-de-France",
  },
];

export const REPERES_COTITULAIRE = [
  {
    titre: "Retirer un nom, ce n'est pas la même chose que reprendre le véhicule",
    texte:
      "Si les deux noms figurent déjà sur la carte grise, en case C.4.1, retirer celui de l'autre est une simple mise à jour du titre. Si en revanche le véhicule est au seul nom de votre ex-conjoint et que vous voulez le mettre au vôtre, ce n'est plus un retrait de cotitulaire mais un changement de titulaire : une autre démarche, d'autres pièces, et un prix qui dépend du cas. Notre simulateur donne le montant exact à partir de la plaque.",
  },
  {
    titre: "Vendre exige les deux signatures",
    texte:
      "C'est la contrainte principale de la cotitularité, et elle surprend au moment de la vente : le titulaire principal ne peut pas céder le véhicule seul. Les deux noms doivent signer la déclaration de cession et barrer la carte grise. En cas de désaccord, ou si l'un des deux est injoignable, la vente est bloquée tant que la situation n'est pas réglée.",
  },
  {
    titre: "L'amende part chez le titulaire principal",
    texte:
      "Les avis de contravention sont adressés au premier nom figurant sur le certificat. C'est à lui de désigner le conducteur s'il n'était pas au volant — le cotitulaire ne reçoit rien et n'est pas sollicité d'office. Autre conséquence, souvent ignorée : les points sont retirés au conducteur désigné, pas au titulaire.",
  },
  {
    titre: "Deux adresses, un seul domicile sur le titre",
    texte:
      "Les cotitulaires n'ont pas besoin d'habiter ensemble, mais la carte grise ne porte qu'une adresse : celle du titulaire principal. C'est elle qui détermine le tarif du cheval fiscal quand une taxe est due, et c'est là que partiront tous les courriers liés au véhicule.",
  },
  {
    titre: "L'assurance suit, mais pas toute seule",
    texte:
      "Le cotitulaire peut assurer le véhicule à son nom, et peut en être le conducteur principal déclaré. Mais le contrat ne se met pas à jour de lui-même : prévenez l'assureur après la modification du titre, sans quoi la carte grise et le contrat désigneront deux personnes différentes.",
  },
];
