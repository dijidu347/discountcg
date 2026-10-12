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
  { question: "Quels frais de dossier appliquez-vous ?", answer: "Ils commencent à 30 €, parmi les plus bas du marché pour un service agréé par l'État. Ils s'ajoutent aux taxes, qui vont à l'État et aux collectivités." },
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
    answer: "Non. Le prix officiel du certificat d'immatriculation ne comprend que les taxes reversées à l'État et aux collectivités. Passer par un service agréé ajoute des frais de dossier, qui couvrent la vérification des pièces, le traitement auprès de l'ANTS et l'envoi du titre. Chez Discount Carte Grise, ils commencent à 30 €.",
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
