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

// Tant que ce champ vaut `null`, la barre n'affiche aucune note : mieux vaut
// ne rien montrer qu'un chiffre que personne ne peut vérifier.
export const AVIS_GROUPE: AvisGroupe | null = null;

/** « 4,8 » et non « 4.8 ». */
export const noteEnFrancais = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
