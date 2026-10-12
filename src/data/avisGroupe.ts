// La note affichée dans la barre du site, et d'où elle vient.
//
// Elle y était écrite en dur — cinq étoiles pleines et « 5.0 / 5 avis clients »
// — sans source, sans nombre, sans date, et sans aucune table d'avis en base.
// Rien derrière. Deux raisons de ne pas laisser ça :
//
//   · L'article L.111-7-2 du code de la consommation impose, dès qu'on affiche
//     une note moyenne, d'indiquer comment les avis sont collectés, combien ils
//     sont et de quand ils datent. Une note sans source est précisément ce que
//     la DGCCRF sanctionne.
//   · Les avis invoqués sont ceux de Discount Auto Pare-Brise, l'atelier du
//     groupe. Ils portent sur du pare-brise, pas sur des démarches
//     d'immatriculation. Les présenter comme « avis clients » de ce site-ci
//     ferait croire au visiteur qu'ils jugent le service qu'il s'apprête à
//     acheter. Attribués, ils restent vrais et disent quelque chose de juste :
//     le sérieux du groupe.
//
// Pour la même raison, cette note n'entre PAS dans les données structurées du
// site. Une `aggregateRating` déclarée sur une entité doit porter sur les avis
// de CETTE entité ; y mettre ceux d'une société sœur vaut une pénalité
// manuelle, et on perdrait les étoiles au lieu de les gagner. Le jour où
// Discount Carte Grise aura sa propre fiche Google, ce sera elle qui la
// portera.

export interface AvisGroupe {
  /** La société réellement notée, nommée telle qu'elle l'est sur Google. */
  societe: string;
  /** Ce qu'elle est pour nous, en deux mots. */
  lien: string;
  note: number;
  nombre: number;
  /** L'URL de la fiche Google, pour que la note soit vérifiable d'un clic. */
  url: string;
}

// Relevé sur la fiche Google le 12 octobre 2026. Deux écarts avec ce qu'on
// croyait : l'établissement s'appelle « Garage Jimmy2x Discount Auto
// Mécanique » et non « Discount Auto Pare-Brise » — c'est la même société,
// SIRET 830 888 277 00027, mais c'est sous ce nom-là que Google le connaît et
// donc sous celui-là qu'il est vérifiable. Et la note est de 4,8, pas de 5,0.
//
// Google le classe en vendeur de véhicules et réparation : les avis portent
// sur la vente et la mécanique. D'où « notre garage », et non « notre
// atelier » ni « avis clients ».
export const AVIS_GROUPE: AvisGroupe | null = {
  societe: "Garage Jimmy2x Discount Auto",
  lien: "notre garage",
  note: 4.8,
  nombre: 101,
  url: "https://www.google.com/maps/search/Garage+Jimmy2x+Discount+Auto+M%C3%A9canique+Vestric-et-Candiac",
};

/** « 4,8 » et non « 4.8 ». */
export const noteEnFrancais = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
