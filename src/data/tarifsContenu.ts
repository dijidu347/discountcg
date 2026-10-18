// Le contenu de référence sur le prix de la carte grise, hors de tout JSX.
//
// Ces questions-réponses vivaient dans TarifsCarteGrise.tsx, donc dans un
// composant React — et le prérendu ne lit que des fichiers de données. Elles
// n'arrivaient par conséquent jamais dans le HTML servi : le robot recevait
// l'introduction de la page et le tableau des départements, rien d'autre.
//
// C'est précisément le contenu qui répond à « carte grise pas cher » — la
// famille de requêtes la plus demandée du site, 4 504 impressions sur seize
// mois, en position 28. Le site y répondait déjà ; personne ne le voyait.
//
// Même règle que nonGageContenu.ts et professionnelContenu.ts : les données
// d'un côté, la mise en forme de l'autre, une seule source pour les deux.

export interface Question {
  question: string;
  answer: string;
}

export const FAQ_SERVICE: Question[] = [
  { question: "Combien coûte une carte grise en moyenne ?", answer: "Pour une voiture particulière de 6 CV de moins de dix ans, comptez 271,76 € dans un département à 43 € le cheval fiscal, et 427,76 € à Paris. Le même véhicule passé dix ans de mise en circulation voit sa taxe régionale divisée par deux." },
  { question: "Pourquoi le prix change-t-il d'un département à l'autre ?", answer: "Parce que le tarif du cheval fiscal est voté par chaque conseil régional. Il va de 30 € à Mayotte à 68,95 € en Île-de-France. C'est l'adresse du titulaire qui compte, pas le lieu d'achat du véhicule." },
  { question: "Le simulateur donne-t-il le même prix que celui de l'ANTS ?", answer: "La taxe régionale, oui : les règles sont les mêmes. Notre simulateur y ajoute les frais de dossier, que le simulateur officiel ne chiffre pas, et lit les caractéristiques du véhicule depuis la plaque au lieu de vous les faire saisir." },
  { question: "Le simulateur est-il gratuit ?", answer: "Oui, et sans inscription. Le résultat s'affiche immédiatement, taxes comprises." },
  { question: "Les tarifs sont-ils à jour ?", answer: "Oui. Ce sont les tarifs 2026 votés par les conseils régionaux, et c'est la même table qui alimente le simulateur et le tableau ci-dessus." },
  { question: "Quels frais de dossier appliquez-vous ?", answer: "30 € pour un particulier, 20 € pour un professionnel habilité. C'est un tarif fixe, pas un tarif d'appel : il ne change ni selon le véhicule, ni selon le département. Il s'ajoute aux taxes, qui vont à l'État et aux collectivités." },
];

export const FAQ_TARIFS: Question[] = [
  {
    question: "Quel est le prix moyen d'une carte grise en 2026 ?",
    answer: "Il dépend surtout de la puissance fiscale du véhicule et du département du titulaire. Pour 5 chevaux fiscaux, la taxe régionale va de 150 € à Mayotte (30 €/CV) à 344,75 € en Île-de-France (68,95 €/CV). S'y ajoutent les taxes fixes Y.4 (11 €) et Y.5 (2,76 €). Comptez environ 270 € en moyenne nationale pour un véhicule de 5 CV.",
  },
  {
    question: "Comment calculer le prix de sa carte grise ?",
    answer: "En additionnant cinq taxes : Y.1, la taxe régionale, soit le nombre de chevaux fiscaux multiplié par le tarif de votre département ; Y.2, la taxe professionnelle, nulle pour un particulier ; Y.3, le malus écologique, assis sur les émissions de CO₂ ; Y.4, la taxe de gestion, 11 € ; et Y.5, la redevance d'acheminement, 2,76 €. Notre simulateur fait le calcul en quelques secondes.",
  },
  {
    question: "Quelles régions ont les tarifs les plus bas ?",
    answer: "En 2026, les Hauts-de-France et l'Auvergne-Rhône-Alpes restent les moins chères, à 43 € le cheval fiscal. Le tarif est voté par la région : il est donc le même dans tous ses départements. La Corse se situe à 53 €/CV, les Pays de la Loire à 51 €. À l'inverse, l'Île-de-France est la plus chère, à 68,95 € depuis le 1er mars 2026 — 54,95 € de taxe régionale et 14 € de surtaxe Île-de-France Mobilités. Le tarif le plus bas de France est celui de Mayotte, à 30 €/CV.",
  },
  {
    question: "Les véhicules électriques sont-ils exonérés ?",
    answer: "Plus depuis le 1er mai 2025. L'exonération nationale des véhicules électriques et à hydrogène a été supprimée par l'article 119 de la loi de finances pour 2025, qui a réécrit l'article L. 421-49 du code des impositions sur les biens et services : chaque région décide désormais entre le plein tarif, le demi-tarif et l'exonération totale. En 2026, seuls les Hauts-de-France maintiennent un avantage — exonération totale jusqu'au 31 mars, puis abattement de 50 % depuis le 1er avril. Partout ailleurs, un véhicule électrique paie la taxe régionale au même tarif qu'un thermique. Notre simulateur applique la règle en vigueur : le prix qu'il affiche est celui que vous paierez.",
  },
  {
    question: "Qu'est-ce que le malus écologique ?",
    answer: "C'est la composante Y.3 : une taxe qui frappe les véhicules neufs émettant 108 g/km de CO₂ ou plus depuis le 1er janvier 2026. Son barème est progressif et grimpe jusqu'à 80 000 € au-delà de 191 g. Elle ne vise que le neuf et l'importation ; un véhicule d'occasion déjà immatriculé en France en est exonéré. Un malus au poids s'y ajoute à partir de 1,5 tonne.",
  },
  {
    question: "Le prix de la carte grise inclut-il les frais de service ?",
    answer: "Non. Le prix officiel du certificat d'immatriculation ne comprend que les taxes reversées à l'État et aux collectivités. Passer par un service agréé ajoute des frais de dossier, qui couvrent la vérification des pièces, le traitement auprès de l'ANTS et l'envoi du titre. Chez Discount Carte Grise, ils sont de 30 € pour un particulier et 20 € pour un professionnel, sans supplément.",
  },
  {
    question: "Peut-on payer sa carte grise en plusieurs fois ?",
    answer: "Oui, le montant total — taxes et frais de dossier — se règle en trois ou quatre fois sans frais. L'option se choisit au moment du paiement en ligne.",
  },
  {
    question: "Quel est le délai pour recevoir sa carte grise ?",
    answer: "Le dossier est traité sous 24 h ouvrées une fois toutes les pièces reçues. Vous recevez aussitôt un certificat provisoire d'immatriculation, qui autorise à circuler 30 jours. Le titre définitif est ensuite expédié par l'Imprimerie Nationale sous 3 à 7 jours ouvrés, en courrier sécurisé.",
  },
];

// « Payer sa carte grise moins cher » : la question que le site ne traitait pas.
//
// La famille « pas cher / moins cher » est la première du site — 2 860
// impressions sur seize mois, pour 45 clics, en positions 17 à 37. Les pages
// existantes expliquent COMBIEN coûte une carte grise et POURQUOI le prix
// varie d'un département à l'autre. Aucune ne répond à ce que ces gens
// cherchent réellement : comment payer moins.
//
// La réponse honnête est que l'essentiel du prix est une taxe, qu'aucun
// intermédiaire ne peut réduire, et que les seules remises existantes sont
// prévues par la loi. C'est aussi un argument : quand neuf dixièmes du prix
// sont identiques partout, la part qui reste se compare — et c'est la nôtre.
//
// Chaque chiffre ci-dessous vient du code de calcul ou de la configuration de
// la base, pas d'une estimation : coefficients de `calculatePrice.ts`, frais de
// dossier de `pricing_config`, tarifs du cheval fiscal de `departements.ts`.

export interface Levier {
  /** Le cas, tel que le lecteur se reconnaît dedans. */
  cas: string;
  /** Ce qu'il obtient, en une ligne chiffrée. */
  effet: string;
  /** La règle, pour qu'on puisse vérifier. */
  fondement: string;
}

/** Les réductions qui existent vraiment, et qui sont toutes légales. */
export const LEVIERS_REELS: Levier[] = [
  {
    cas: "Voiture de plus de dix ans",
    effet: "Taxe régionale divisée par deux",
    fondement:
      "L'abattement s'applique dès le dixième anniversaire de la première mise en circulation. Sur un 6 CV dans le Rhône, à 43 € le cheval fiscal, la taxe passe de 258 € à 129 €.",
  },
  {
    cas: "Moto, scooter, quad",
    effet: "Moitié de la taxe régionale, quel que soit l'âge",
    fondement:
      "Les deux-roues et trois-roues motorisés paient la moitié du tarif voté par la région, sans condition d'ancienneté. L'abattement des dix ans ne s'y ajoute donc pas.",
  },
  {
    cas: "Remorque, matériel agricole",
    effet: "Aucune taxe régionale",
    fondement:
      "Remorques, semi-remorques et matériels agricoles automoteurs ne supportent que la taxe fixe de 11 € et la redevance d'acheminement de 2,76 €.",
  },
  {
    cas: "Véhicule hérité du conjoint ou du partenaire de PACS",
    effet: "Exonération de la taxe régionale",
    fondement:
      "L'article L. 421-52 du code des impositions sur les biens et services exonère la délivrance consécutive au décès de l'un des époux ou partenaires. Pour tout autre héritier — un enfant, un frère —, la taxe reste due au tarif normal.",
  },
  {
    cas: "Véhicule électrique immatriculé dans les Hauts-de-France",
    effet: "Abattement de 50 % depuis le 1er avril 2026",
    fondement:
      "L'exonération nationale a disparu le 1er mai 2025, supprimée par l'article 119 de la loi de finances pour 2025. Les Hauts-de-France sont la seule région à conserver un avantage en 2026. Partout ailleurs, un véhicule électrique paie le même tarif qu'un thermique.",
  },
  {
    cas: "Changement d'adresse",
    effet: "Gratuit les trois premières fois",
    fondement:
      "Vous recevez une étiquette à coller sur le certificat. Au quatrième changement, une nouvelle carte grise est éditée : seuls 2,76 € de redevance d'acheminement sont dus, sans taxe régionale ni taxe fixe.",
  },
];

/** Les fausses économies, qu'on nous demande assez souvent pour les traiter. */
export const FAUSSES_ECONOMIES: Levier[] = [
  {
    cas: "Immatriculer dans un département moins cher",
    effet: "Sans effet",
    fondement:
      "C'est l'adresse du titulaire qui détermine le tarif, pas le lieu d'achat, ni le département du vendeur, ni celui du garage qui dépose le dossier. Domicilier la carte grise ailleurs que chez soi est une fausse déclaration.",
  },
  {
    cas: "Attendre que le tarif baisse",
    effet: "Sans effet",
    fondement:
      "Le tarif du cheval fiscal est voté par le conseil régional et ne change qu'à la date fixée par la délibération. Il a augmenté dans plusieurs régions ces dernières années, jamais baissé en cours d'exercice.",
  },
  {
    cas: "Faire la démarche soi-même sur l'ANTS",
    effet: "Économise les frais de dossier, pas les taxes",
    fondement:
      "La démarche est gratuite sur le site de l'État : vous économisez la part de l'intermédiaire, soit 30 € chez nous. Les taxes, elles, sont identiques au centime près. C'est un choix de temps contre argent, pas une réduction du prix officiel.",
  },
];

/** Ce qui reste à comparer une fois les taxes mises de côté. */
export const PART_COMPARABLE = {
  fraisParticulier: 30,
  fraisProfessionnel: 20,
  texte:
    "Sur une carte grise de 5 CV en Auvergne-Rhône-Alpes, les taxes représentent 228,76 € — 215 € de taxe régionale, 11 € de taxe fixe, 2,76 € d'acheminement. Elles sont identiques chez tous les prestataires habilités, et sur le site de l'État. La seule part qui se compare est celle de l'intermédiaire : 30 € chez nous pour un particulier, 20 € pour un professionnel disposant d'un compte. Méfiez-vous d'un tarif d'appel très bas : regardez ce qu'ajoutent les options au moment de payer, et si le certificat provisoire et l'acheminement sont compris.",
};

/** Les questions de cette famille de recherche, qui n'avaient pas de réponse. */
export const FAQ_MOINS_CHER: Question[] = [
  {
    question: "Comment payer sa carte grise moins cher ?",
    answer:
      "Il n'y a pas de remise commerciale possible sur une carte grise : environ neuf dixièmes du prix sont des taxes fixées par la loi et par votre région, identiques partout. Les seules réductions existantes sont prévues par les textes — moitié de la taxe régionale pour un véhicule de plus de dix ans et pour les deux-roues, exonération pour le conjoint survivant, aucune taxe régionale sur les remorques. La seule part qui se compare d'un prestataire à l'autre est le frais de dossier : le nôtre est de 30 € pour un particulier.",
  },
  {
    question: "Une carte grise est-elle moins chère pour un véhicule de plus de dix ans ?",
    answer:
      "Oui, la taxe régionale est divisée par deux à partir du dixième anniversaire de la première mise en circulation. Sur un 6 CV dans le Rhône, elle passe de 258 € à 129 €. L'abattement est automatique : vous n'avez rien à demander, la date figure sur la carte grise.",
  },
  {
    question: "Peut-on immatriculer sa voiture dans un département moins cher ?",
    answer:
      "Non. Le tarif appliqué est celui de la région du domicile du titulaire, pas celui du lieu d'achat ni du garage. Déclarer une adresse qui n'est pas la sienne pour payer moins est une fausse déclaration, et la carte grise peut être annulée.",
  },
  {
    question: "Où la carte grise est-elle la moins chère en France ?",
    answer:
      "À Mayotte, à 30 € le cheval fiscal. En métropole, les Hauts-de-France et l'Auvergne-Rhône-Alpes sont les moins chères, à 43 €, contre 68,95 € en Île-de-France. Mais ce tarif suit votre domicile : il ne se choisit pas.",
  },
  {
    question: "Vos frais de dossier s'ajoutent-ils aux taxes ?",
    answer:
      "Oui, et ils sont affichés séparément. Les taxes partent intégralement à l'État et aux collectivités : nous les encaissons et les reversons. Nos 30 € couvrent la vérification des pièces, le dépôt auprès de l'ANTS et le suivi jusqu'à la réception du titre.",
  },
];
