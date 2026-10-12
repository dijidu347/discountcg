// Les 101 départements, et ce qui distingue vraiment l'un de l'autre.
//
// Ce fichier existe pour une raison précise. Le tarif du cheval fiscal est voté
// par la RÉGION : les douze départements d'Auvergne-Rhône-Alpes partagent le
// même 43 €, les treize d'Occitanie le même 59,50 €. Une page par département
// qui ne dirait que le prix serait donc treize textes recopiés cent une fois —
// exactement ce que les moteurs appellent une page satellite, et exactement ce
// qui est arrivé à l'ancienne page /prix-carte-grise : deux liens entrants,
// aucun trafic.
//
// Ce qui change réellement d'un département à l'autre, et qu'on trouve ici :
//
//   - son chef-lieu et ses principales communes, parce qu'on cherche « carte
//     grise Lyon » bien plus souvent que « carte grise Rhône » ;
//   - ses départements limitrophes, qui portent le seul calcul propre à chaque
//     page : franchir la frontière change le prix, ou ne le change pas, et
//     c'est une vraie question quand on habite près d'une limite régionale.
//
// Le tarif, lui, reste dans departementsTarifs.ts : une seule source, celle
// qu'utilise déjà le simulateur.

export interface Departement {
  /** Code INSEE : « 01 », « 2A », « 971 ». */
  code: string;
  nom: string;
  /** Segment d'URL, sans le code. */
  slug: string;
  /** Clé de région, telle que REGIONS la définit. */
  region: string;
  /** « dans le Rhône », « en Gironde », « à Paris » : la forme locative. */
  dans: string;
  /** « du Rhône », « de la Gironde », « de Paris » : la forme possessive. */
  de: string;
  /** « le Rhône », « l'Ain », « les Vosges », « Paris » : le nom avec son article. */
  le: string;
  chefLieu: string;
  /** Quelques communes connues, chef-lieu compris : ce sont elles qu'on tape. */
  communes: string[];
  /** Codes des départements limitrophes. Vide pour l'outre-mer et la Corse. */
  limitrophes: string[];
}

export interface Region {
  nom: string;
  slug: string;
  /**
   * La collectivité qui vote le tarif, telle qu'on la nomme dans une phrase :
   * « voté par la région Bretagne », « voté par la collectivité de Corse ».
   * Les cinq territoires d'outre-mer n'ont pas de « région » au sens courant,
   * et écrire « la région Mayotte » serait faux.
   */
  votant: string;
  /** « en Auvergne-Rhône-Alpes », « dans les Hauts-de-France ». */
  dans: string;
  /**
   * Ce que la région a voté pour les véhicules électriques et à hydrogène
   * depuis que la loi de finances pour 2025 lui en a rendu le choix
   * (article 119, réécrivant l'article L. 421-49 du code des impositions sur
   * les biens et services). 1 = plein tarif, 0.5 = demi-tarif, 0 = exonération.
   */
  coefficientElectrique: number;
  /** Précision affichée quand le coefficient n'est pas le plein tarif. */
  noteElectrique?: string;
}

export const REGIONS: Record<string, Region> = {
  idf: {
    nom: "Île-de-France",
    votant: "la région Île-de-France",
    slug: "ile-de-france",
    dans: "en Île-de-France",
    coefficientElectrique: 1,
  },
  ara: {
    nom: "Auvergne-Rhône-Alpes",
    votant: "la région Auvergne-Rhône-Alpes",
    slug: "auvergne-rhone-alpes",
    dans: "en Auvergne-Rhône-Alpes",
    coefficientElectrique: 1,
  },
  bfc: {
    nom: "Bourgogne-Franche-Comté",
    votant: "la région Bourgogne-Franche-Comté",
    slug: "bourgogne-franche-comte",
    dans: "en Bourgogne-Franche-Comté",
    coefficientElectrique: 1,
  },
  bre: {
    nom: "Bretagne",
    votant: "la région Bretagne",
    slug: "bretagne",
    dans: "en Bretagne",
    coefficientElectrique: 1,
  },
  cvl: {
    nom: "Centre-Val de Loire",
    votant: "la région Centre-Val de Loire",
    slug: "centre-val-de-loire",
    dans: "en Centre-Val de Loire",
    coefficientElectrique: 1,
  },
  cor: {
    nom: "Corse",
    votant: "la collectivité de Corse",
    slug: "corse",
    dans: "en Corse",
    coefficientElectrique: 1,
  },
  ge: {
    nom: "Grand Est",
    votant: "la région Grand Est",
    slug: "grand-est",
    dans: "dans le Grand Est",
    coefficientElectrique: 1,
  },
  hdf: {
    nom: "Hauts-de-France",
    votant: "la région Hauts-de-France",
    slug: "hauts-de-france",
    dans: "dans les Hauts-de-France",
    coefficientElectrique: 0.5,
    noteElectrique:
      "Seule région de France à maintenir un avantage : l'exonération totale a couru jusqu'au 31 mars 2026, remplacée depuis le 1er avril par un abattement de 50 % sur la taxe régionale.",
  },
  nor: {
    nom: "Normandie",
    votant: "la région Normandie",
    slug: "normandie",
    dans: "en Normandie",
    coefficientElectrique: 1,
  },
  na: {
    nom: "Nouvelle-Aquitaine",
    votant: "la région Nouvelle-Aquitaine",
    slug: "nouvelle-aquitaine",
    dans: "en Nouvelle-Aquitaine",
    coefficientElectrique: 1,
  },
  occ: {
    nom: "Occitanie",
    votant: "la région Occitanie",
    slug: "occitanie",
    dans: "en Occitanie",
    coefficientElectrique: 1,
  },
  pdl: {
    nom: "Pays de la Loire",
    votant: "la région Pays de la Loire",
    slug: "pays-de-la-loire",
    dans: "en Pays de la Loire",
    coefficientElectrique: 1,
  },
  paca: {
    nom: "Provence-Alpes-Côte d'Azur",
    votant: "la région Provence-Alpes-Côte d'Azur",
    slug: "provence-alpes-cote-d-azur",
    dans: "en Provence-Alpes-Côte d'Azur",
    coefficientElectrique: 1,
  },
  gua: { nom: "Guadeloupe", votant: "le conseil régional de Guadeloupe", slug: "guadeloupe", dans: "en Guadeloupe", coefficientElectrique: 1 },
  mar: { nom: "Martinique", votant: "la collectivité territoriale de Martinique", slug: "martinique", dans: "en Martinique", coefficientElectrique: 1 },
  guy: { nom: "Guyane", votant: "la collectivité territoriale de Guyane", slug: "guyane", dans: "en Guyane", coefficientElectrique: 1 },
  reu: { nom: "La Réunion", votant: "le conseil régional de La Réunion", slug: "la-reunion", dans: "à La Réunion", coefficientElectrique: 1 },
  may: { nom: "Mayotte", votant: "le Département de Mayotte", slug: "mayotte", dans: "à Mayotte", coefficientElectrique: 1 },
};

export const DEPARTEMENTS: Departement[] = [
  { code: "01", nom: "Ain", slug: "ain", region: "ara", dans: "dans l'Ain", de: "de l'Ain", le: "l'Ain", chefLieu: "Bourg-en-Bresse", communes: ["Bourg-en-Bresse", "Oyonnax", "Ambérieu-en-Bugey", "Gex", "Bellegarde-sur-Valserine"], limitrophes: ["39", "71", "69", "38", "73", "74"] },
  { code: "02", nom: "Aisne", slug: "aisne", region: "hdf", dans: "dans l'Aisne", de: "de l'Aisne", le: "l'Aisne", chefLieu: "Laon", communes: ["Laon", "Saint-Quentin", "Soissons", "Château-Thierry", "Chauny"], limitrophes: ["59", "80", "60", "77", "51", "08"] },
  { code: "03", nom: "Allier", slug: "allier", region: "ara", dans: "dans l'Allier", de: "de l'Allier", le: "l'Allier", chefLieu: "Moulins", communes: ["Moulins", "Montluçon", "Vichy", "Cusset", "Yzeure"], limitrophes: ["18", "58", "71", "42", "63", "23", "36"] },
  { code: "04", nom: "Alpes-de-Haute-Provence", slug: "alpes-de-haute-provence", region: "paca", dans: "dans les Alpes-de-Haute-Provence", de: "des Alpes-de-Haute-Provence", le: "les Alpes-de-Haute-Provence", chefLieu: "Digne-les-Bains", communes: ["Digne-les-Bains", "Manosque", "Sisteron", "Forcalquier", "Castellane"], limitrophes: ["05", "06", "83", "84", "26", "13"] },
  { code: "05", nom: "Hautes-Alpes", slug: "hautes-alpes", region: "paca", dans: "dans les Hautes-Alpes", de: "des Hautes-Alpes", le: "les Hautes-Alpes", chefLieu: "Gap", communes: ["Gap", "Briançon", "Embrun", "Laragne-Montéglin", "Veynes"], limitrophes: ["04", "06", "26", "38", "73"] },
  { code: "06", nom: "Alpes-Maritimes", slug: "alpes-maritimes", region: "paca", dans: "dans les Alpes-Maritimes", de: "des Alpes-Maritimes", le: "les Alpes-Maritimes", chefLieu: "Nice", communes: ["Nice", "Cannes", "Antibes", "Grasse", "Cagnes-sur-Mer", "Menton"], limitrophes: ["04", "05", "83"] },
  { code: "07", nom: "Ardèche", slug: "ardeche", region: "ara", dans: "en Ardèche", de: "de l'Ardèche", le: "l'Ardèche", chefLieu: "Privas", communes: ["Privas", "Annonay", "Aubenas", "Tournon-sur-Rhône", "Guilherand-Granges"], limitrophes: ["26", "30", "38", "42", "43", "48", "84"] },
  { code: "08", nom: "Ardennes", slug: "ardennes", region: "ge", dans: "dans les Ardennes", de: "des Ardennes", le: "les Ardennes", chefLieu: "Charleville-Mézières", communes: ["Charleville-Mézières", "Sedan", "Rethel", "Vouziers", "Revin"], limitrophes: ["02", "51", "55"] },
  { code: "09", nom: "Ariège", slug: "ariege", region: "occ", dans: "en Ariège", de: "de l'Ariège", le: "l'Ariège", chefLieu: "Foix", communes: ["Foix", "Pamiers", "Saint-Girons", "Lavelanet", "Mirepoix"], limitrophes: ["11", "31", "66"] },
  { code: "10", nom: "Aube", slug: "aube", region: "ge", dans: "dans l'Aube", de: "de l'Aube", le: "l'Aube", chefLieu: "Troyes", communes: ["Troyes", "Romilly-sur-Seine", "La Chapelle-Saint-Luc", "Saint-André-les-Vergers", "Bar-sur-Aube"], limitrophes: ["51", "52", "21", "89", "77"] },
  { code: "11", nom: "Aude", slug: "aude", region: "occ", dans: "dans l'Aude", de: "de l'Aude", le: "l'Aude", chefLieu: "Carcassonne", communes: ["Carcassonne", "Narbonne", "Castelnaudary", "Limoux", "Lézignan-Corbières"], limitrophes: ["09", "31", "34", "66", "81"] },
  { code: "12", nom: "Aveyron", slug: "aveyron", region: "occ", dans: "dans l'Aveyron", de: "de l'Aveyron", le: "l'Aveyron", chefLieu: "Rodez", communes: ["Rodez", "Millau", "Villefranche-de-Rouergue", "Onet-le-Château", "Decazeville"], limitrophes: ["15", "30", "34", "46", "48", "81", "82"] },
  { code: "13", nom: "Bouches-du-Rhône", slug: "bouches-du-rhone", region: "paca", dans: "dans les Bouches-du-Rhône", de: "des Bouches-du-Rhône", le: "les Bouches-du-Rhône", chefLieu: "Marseille", communes: ["Marseille", "Aix-en-Provence", "Arles", "Martigues", "Aubagne", "Salon-de-Provence"], limitrophes: ["04", "30", "83", "84"] },
  { code: "14", nom: "Calvados", slug: "calvados", region: "nor", dans: "dans le Calvados", de: "du Calvados", le: "le Calvados", chefLieu: "Caen", communes: ["Caen", "Hérouville-Saint-Clair", "Lisieux", "Bayeux", "Vire Normandie"], limitrophes: ["27", "50", "61"] },
  { code: "15", nom: "Cantal", slug: "cantal", region: "ara", dans: "dans le Cantal", de: "du Cantal", le: "le Cantal", chefLieu: "Aurillac", communes: ["Aurillac", "Saint-Flour", "Mauriac", "Arpajon-sur-Cère", "Ytrac"], limitrophes: ["12", "19", "43", "46", "48", "63"] },
  { code: "16", nom: "Charente", slug: "charente", region: "na", dans: "en Charente", de: "de la Charente", le: "la Charente", chefLieu: "Angoulême", communes: ["Angoulême", "Cognac", "Soyaux", "La Couronne", "Ruffec"], limitrophes: ["17", "24", "79", "86", "87"] },
  { code: "17", nom: "Charente-Maritime", slug: "charente-maritime", region: "na", dans: "en Charente-Maritime", de: "de la Charente-Maritime", le: "la Charente-Maritime", chefLieu: "La Rochelle", communes: ["La Rochelle", "Saintes", "Rochefort", "Royan", "Saint-Jean-d'Angély"], limitrophes: ["16", "24", "33", "79", "85"] },
  { code: "18", nom: "Cher", slug: "cher", region: "cvl", dans: "dans le Cher", de: "du Cher", le: "le Cher", chefLieu: "Bourges", communes: ["Bourges", "Vierzon", "Saint-Amand-Montrond", "Saint-Doulchard", "Aubigny-sur-Nère"], limitrophes: ["03", "23", "36", "41", "45", "58"] },
  { code: "19", nom: "Corrèze", slug: "correze", region: "na", dans: "en Corrèze", de: "de la Corrèze", le: "la Corrèze", chefLieu: "Tulle", communes: ["Tulle", "Brive-la-Gaillarde", "Ussel", "Malemort", "Objat"], limitrophes: ["15", "23", "24", "46", "63", "87"] },
  { code: "21", nom: "Côte-d'Or", slug: "cote-d-or", region: "bfc", dans: "en Côte-d'Or", de: "de la Côte-d'Or", le: "la Côte-d'Or", chefLieu: "Dijon", communes: ["Dijon", "Beaune", "Chenôve", "Talant", "Quetigny"], limitrophes: ["10", "39", "52", "58", "70", "71", "89"] },
  { code: "22", nom: "Côtes-d'Armor", slug: "cotes-d-armor", region: "bre", dans: "dans les Côtes-d'Armor", de: "des Côtes-d'Armor", le: "les Côtes-d'Armor", chefLieu: "Saint-Brieuc", communes: ["Saint-Brieuc", "Lannion", "Dinan", "Lamballe-Armor", "Plérin"], limitrophes: ["29", "35", "56"] },
  { code: "23", nom: "Creuse", slug: "creuse", region: "na", dans: "dans la Creuse", de: "de la Creuse", le: "la Creuse", chefLieu: "Guéret", communes: ["Guéret", "La Souterraine", "Aubusson", "Bourganeuf", "Boussac"], limitrophes: ["03", "18", "19", "36", "63", "87"] },
  { code: "24", nom: "Dordogne", slug: "dordogne", region: "na", dans: "en Dordogne", de: "de la Dordogne", le: "la Dordogne", chefLieu: "Périgueux", communes: ["Périgueux", "Bergerac", "Sarlat-la-Canéda", "Boulazac Isle Manoire", "Coulounieix-Chamiers"], limitrophes: ["16", "17", "19", "33", "46", "47", "87"] },
  { code: "25", nom: "Doubs", slug: "doubs", region: "bfc", dans: "dans le Doubs", de: "du Doubs", le: "le Doubs", chefLieu: "Besançon", communes: ["Besançon", "Montbéliard", "Pontarlier", "Audincourt", "Valentigney"], limitrophes: ["39", "70", "90"] },
  { code: "26", nom: "Drôme", slug: "drome", region: "ara", dans: "dans la Drôme", de: "de la Drôme", le: "la Drôme", chefLieu: "Valence", communes: ["Valence", "Montélimar", "Romans-sur-Isère", "Bourg-lès-Valence", "Pierrelatte"], limitrophes: ["04", "05", "07", "38", "84"] },
  { code: "27", nom: "Eure", slug: "eure", region: "nor", dans: "dans l'Eure", de: "de l'Eure", le: "l'Eure", chefLieu: "Évreux", communes: ["Évreux", "Vernon", "Louviers", "Val-de-Reuil", "Gisors"], limitrophes: ["14", "28", "60", "61", "76", "78", "95"] },
  { code: "28", nom: "Eure-et-Loir", slug: "eure-et-loir", region: "cvl", dans: "en Eure-et-Loir", de: "d'Eure-et-Loir", le: "l'Eure-et-Loir", chefLieu: "Chartres", communes: ["Chartres", "Dreux", "Châteaudun", "Lucé", "Nogent-le-Rotrou"], limitrophes: ["27", "41", "45", "61", "72", "78", "91"] },
  { code: "29", nom: "Finistère", slug: "finistere", region: "bre", dans: "dans le Finistère", de: "du Finistère", le: "le Finistère", chefLieu: "Quimper", communes: ["Quimper", "Brest", "Concarneau", "Morlaix", "Douarnenez"], limitrophes: ["22", "56"] },
  { code: "2A", nom: "Corse-du-Sud", slug: "corse-du-sud", region: "cor", dans: "en Corse-du-Sud", de: "de la Corse-du-Sud", le: "la Corse-du-Sud", chefLieu: "Ajaccio", communes: ["Ajaccio", "Porto-Vecchio", "Propriano", "Sartène", "Bonifacio"], limitrophes: ["2B"] },
  { code: "2B", nom: "Haute-Corse", slug: "haute-corse", region: "cor", dans: "en Haute-Corse", de: "de la Haute-Corse", le: "la Haute-Corse", chefLieu: "Bastia", communes: ["Bastia", "Corte", "Calvi", "Île-Rousse", "Ghisonaccia"], limitrophes: ["2A"] },
  { code: "30", nom: "Gard", slug: "gard", region: "occ", dans: "dans le Gard", de: "du Gard", le: "le Gard", chefLieu: "Nîmes", communes: ["Nîmes", "Alès", "Bagnols-sur-Cèze", "Beaucaire", "Villeneuve-lès-Avignon"], limitrophes: ["07", "12", "13", "34", "48", "84"] },
  { code: "31", nom: "Haute-Garonne", slug: "haute-garonne", region: "occ", dans: "en Haute-Garonne", de: "de la Haute-Garonne", le: "la Haute-Garonne", chefLieu: "Toulouse", communes: ["Toulouse", "Colomiers", "Tournefeuille", "Muret", "Blagnac"], limitrophes: ["09", "11", "32", "65", "81", "82"] },
  { code: "32", nom: "Gers", slug: "gers", region: "occ", dans: "dans le Gers", de: "du Gers", le: "le Gers", chefLieu: "Auch", communes: ["Auch", "Condom", "L'Isle-Jourdain", "Fleurance", "Lectoure"], limitrophes: ["31", "40", "47", "64", "65", "82"] },
  { code: "33", nom: "Gironde", slug: "gironde", region: "na", dans: "en Gironde", de: "de la Gironde", le: "la Gironde", chefLieu: "Bordeaux", communes: ["Bordeaux", "Mérignac", "Pessac", "Talence", "Villenave-d'Ornon", "Arcachon"], limitrophes: ["17", "24", "40", "47"] },
  { code: "34", nom: "Hérault", slug: "herault", region: "occ", dans: "dans l'Hérault", de: "de l'Hérault", le: "l'Hérault", chefLieu: "Montpellier", communes: ["Montpellier", "Béziers", "Sète", "Lunel", "Agde"], limitrophes: ["11", "12", "30", "48", "81"] },
  { code: "35", nom: "Ille-et-Vilaine", slug: "ille-et-vilaine", region: "bre", dans: "en Ille-et-Vilaine", de: "d'Ille-et-Vilaine", le: "l'Ille-et-Vilaine", chefLieu: "Rennes", communes: ["Rennes", "Saint-Malo", "Fougères", "Vitré", "Bruz"], limitrophes: ["22", "44", "49", "50", "53", "56"] },
  { code: "36", nom: "Indre", slug: "indre", region: "cvl", dans: "dans l'Indre", de: "de l'Indre", le: "l'Indre", chefLieu: "Châteauroux", communes: ["Châteauroux", "Issoudun", "Le Blanc", "Déols", "Argenton-sur-Creuse"], limitrophes: ["03", "18", "23", "37", "41", "86", "87"] },
  { code: "37", nom: "Indre-et-Loire", slug: "indre-et-loire", region: "cvl", dans: "en Indre-et-Loire", de: "d'Indre-et-Loire", le: "l'Indre-et-Loire", chefLieu: "Tours", communes: ["Tours", "Joué-lès-Tours", "Saint-Cyr-sur-Loire", "Amboise", "Chinon"], limitrophes: ["36", "41", "49", "72", "86"] },
  { code: "38", nom: "Isère", slug: "isere", region: "ara", dans: "en Isère", de: "de l'Isère", le: "l'Isère", chefLieu: "Grenoble", communes: ["Grenoble", "Saint-Martin-d'Hères", "Échirolles", "Vienne", "Bourgoin-Jallieu"], limitrophes: ["01", "05", "07", "26", "42", "69", "73"] },
  { code: "39", nom: "Jura", slug: "jura", region: "bfc", dans: "dans le Jura", de: "du Jura", le: "le Jura", chefLieu: "Lons-le-Saunier", communes: ["Lons-le-Saunier", "Dole", "Saint-Claude", "Champagnole", "Morez"], limitrophes: ["01", "21", "25", "70", "71"] },
  { code: "40", nom: "Landes", slug: "landes", region: "na", dans: "dans les Landes", de: "des Landes", le: "les Landes", chefLieu: "Mont-de-Marsan", communes: ["Mont-de-Marsan", "Dax", "Biscarrosse", "Saint-Paul-lès-Dax", "Tarnos"], limitrophes: ["32", "33", "47", "64"] },
  { code: "41", nom: "Loir-et-Cher", slug: "loir-et-cher", region: "cvl", dans: "en Loir-et-Cher", de: "de Loir-et-Cher", le: "le Loir-et-Cher", chefLieu: "Blois", communes: ["Blois", "Romorantin-Lanthenay", "Vendôme", "Vineuil", "Salbris"], limitrophes: ["18", "28", "36", "37", "45", "72"] },
  { code: "42", nom: "Loire", slug: "loire", region: "ara", dans: "dans la Loire", de: "de la Loire", le: "la Loire", chefLieu: "Saint-Étienne", communes: ["Saint-Étienne", "Roanne", "Saint-Chamond", "Firminy", "Montbrison"], limitrophes: ["03", "07", "38", "43", "63", "69", "71"] },
  { code: "43", nom: "Haute-Loire", slug: "haute-loire", region: "ara", dans: "en Haute-Loire", de: "de la Haute-Loire", le: "la Haute-Loire", chefLieu: "Le Puy-en-Velay", communes: ["Le Puy-en-Velay", "Monistrol-sur-Loire", "Yssingeaux", "Brioude", "Sainte-Sigolène"], limitrophes: ["07", "15", "42", "48", "63"] },
  { code: "44", nom: "Loire-Atlantique", slug: "loire-atlantique", region: "pdl", dans: "en Loire-Atlantique", de: "de la Loire-Atlantique", le: "la Loire-Atlantique", chefLieu: "Nantes", communes: ["Nantes", "Saint-Nazaire", "Saint-Herblain", "Rezé", "Orvault"], limitrophes: ["35", "49", "56", "85"] },
  { code: "45", nom: "Loiret", slug: "loiret", region: "cvl", dans: "dans le Loiret", de: "du Loiret", le: "le Loiret", chefLieu: "Orléans", communes: ["Orléans", "Olivet", "Fleury-les-Aubrais", "Montargis", "Gien"], limitrophes: ["18", "28", "41", "58", "77", "89", "91"] },
  { code: "46", nom: "Lot", slug: "lot", region: "occ", dans: "dans le Lot", de: "du Lot", le: "le Lot", chefLieu: "Cahors", communes: ["Cahors", "Figeac", "Gourdon", "Souillac", "Saint-Céré"], limitrophes: ["12", "15", "19", "24", "47", "82"] },
  { code: "47", nom: "Lot-et-Garonne", slug: "lot-et-garonne", region: "na", dans: "en Lot-et-Garonne", de: "de Lot-et-Garonne", le: "le Lot-et-Garonne", chefLieu: "Agen", communes: ["Agen", "Villeneuve-sur-Lot", "Marmande", "Le Passage", "Tonneins"], limitrophes: ["24", "32", "33", "40", "46", "82"] },
  { code: "48", nom: "Lozère", slug: "lozere", region: "occ", dans: "en Lozère", de: "de la Lozère", le: "la Lozère", chefLieu: "Mende", communes: ["Mende", "Marvejols", "Saint-Chély-d'Apcher", "Florac Trois Rivières", "Langogne"], limitrophes: ["07", "12", "15", "30", "34", "43"] },
  { code: "49", nom: "Maine-et-Loire", slug: "maine-et-loire", region: "pdl", dans: "en Maine-et-Loire", de: "de Maine-et-Loire", le: "le Maine-et-Loire", chefLieu: "Angers", communes: ["Angers", "Cholet", "Saumur", "Trélazé", "Avrillé"], limitrophes: ["35", "37", "44", "53", "72", "79", "85", "86"] },
  { code: "50", nom: "Manche", slug: "manche", region: "nor", dans: "dans la Manche", de: "de la Manche", le: "la Manche", chefLieu: "Saint-Lô", communes: ["Saint-Lô", "Cherbourg-en-Cotentin", "Granville", "Avranches", "Coutances"], limitrophes: ["14", "35", "53", "61"] },
  { code: "51", nom: "Marne", slug: "marne", region: "ge", dans: "dans la Marne", de: "de la Marne", le: "la Marne", chefLieu: "Châlons-en-Champagne", communes: ["Châlons-en-Champagne", "Reims", "Épernay", "Vitry-le-François", "Sézanne"], limitrophes: ["02", "08", "10", "52", "55", "77"] },
  { code: "52", nom: "Haute-Marne", slug: "haute-marne", region: "ge", dans: "en Haute-Marne", de: "de la Haute-Marne", le: "la Haute-Marne", chefLieu: "Chaumont", communes: ["Chaumont", "Saint-Dizier", "Langres", "Joinville", "Bourbonne-les-Bains"], limitrophes: ["10", "21", "51", "55", "70", "88"] },
  { code: "53", nom: "Mayenne", slug: "mayenne", region: "pdl", dans: "en Mayenne", de: "de la Mayenne", le: "la Mayenne", chefLieu: "Laval", communes: ["Laval", "Mayenne", "Château-Gontier-sur-Mayenne", "Évron", "Ernée"], limitrophes: ["35", "49", "50", "61", "72"] },
  { code: "54", nom: "Meurthe-et-Moselle", slug: "meurthe-et-moselle", region: "ge", dans: "en Meurthe-et-Moselle", de: "de Meurthe-et-Moselle", le: "la Meurthe-et-Moselle", chefLieu: "Nancy", communes: ["Nancy", "Vandœuvre-lès-Nancy", "Lunéville", "Toul", "Longwy"], limitrophes: ["55", "57", "88"] },
  { code: "55", nom: "Meuse", slug: "meuse", region: "ge", dans: "dans la Meuse", de: "de la Meuse", le: "la Meuse", chefLieu: "Bar-le-Duc", communes: ["Bar-le-Duc", "Verdun", "Commercy", "Saint-Mihiel", "Étain"], limitrophes: ["08", "51", "52", "54", "88"] },
  { code: "56", nom: "Morbihan", slug: "morbihan", region: "bre", dans: "dans le Morbihan", de: "du Morbihan", le: "le Morbihan", chefLieu: "Vannes", communes: ["Vannes", "Lorient", "Lanester", "Pontivy", "Ploemeur"], limitrophes: ["22", "29", "35", "44"] },
  { code: "57", nom: "Moselle", slug: "moselle", region: "ge", dans: "en Moselle", de: "de la Moselle", le: "la Moselle", chefLieu: "Metz", communes: ["Metz", "Thionville", "Montigny-lès-Metz", "Sarreguemines", "Forbach"], limitrophes: ["54", "67", "88"] },
  { code: "58", nom: "Nièvre", slug: "nievre", region: "bfc", dans: "dans la Nièvre", de: "de la Nièvre", le: "la Nièvre", chefLieu: "Nevers", communes: ["Nevers", "Cosne-Cours-sur-Loire", "Varennes-Vauzelles", "Decize", "Clamecy"], limitrophes: ["03", "18", "21", "45", "71", "89"] },
  { code: "59", nom: "Nord", slug: "nord", region: "hdf", dans: "dans le Nord", de: "du Nord", le: "le Nord", chefLieu: "Lille", communes: ["Lille", "Roubaix", "Tourcoing", "Dunkerque", "Villeneuve-d'Ascq", "Valenciennes"], limitrophes: ["02", "62"] },
  { code: "60", nom: "Oise", slug: "oise", region: "hdf", dans: "dans l'Oise", de: "de l'Oise", le: "l'Oise", chefLieu: "Beauvais", communes: ["Beauvais", "Compiègne", "Creil", "Nogent-sur-Oise", "Senlis"], limitrophes: ["02", "27", "76", "77", "80", "95"] },
  { code: "61", nom: "Orne", slug: "orne", region: "nor", dans: "dans l'Orne", de: "de l'Orne", le: "l'Orne", chefLieu: "Alençon", communes: ["Alençon", "Flers", "Argentan", "L'Aigle", "Mortagne-au-Perche"], limitrophes: ["14", "27", "28", "50", "53", "72"] },
  { code: "62", nom: "Pas-de-Calais", slug: "pas-de-calais", region: "hdf", dans: "dans le Pas-de-Calais", de: "du Pas-de-Calais", le: "le Pas-de-Calais", chefLieu: "Arras", communes: ["Arras", "Calais", "Boulogne-sur-Mer", "Lens", "Liévin", "Béthune"], limitrophes: ["59", "80"] },
  { code: "63", nom: "Puy-de-Dôme", slug: "puy-de-dome", region: "ara", dans: "dans le Puy-de-Dôme", de: "du Puy-de-Dôme", le: "le Puy-de-Dôme", chefLieu: "Clermont-Ferrand", communes: ["Clermont-Ferrand", "Riom", "Cournon-d'Auvergne", "Chamalières", "Issoire"], limitrophes: ["03", "15", "19", "23", "42", "43"] },
  { code: "64", nom: "Pyrénées-Atlantiques", slug: "pyrenees-atlantiques", region: "na", dans: "dans les Pyrénées-Atlantiques", de: "des Pyrénées-Atlantiques", le: "les Pyrénées-Atlantiques", chefLieu: "Pau", communes: ["Pau", "Bayonne", "Anglet", "Biarritz", "Oloron-Sainte-Marie"], limitrophes: ["32", "40", "65"] },
  { code: "65", nom: "Hautes-Pyrénées", slug: "hautes-pyrenees", region: "occ", dans: "dans les Hautes-Pyrénées", de: "des Hautes-Pyrénées", le: "les Hautes-Pyrénées", chefLieu: "Tarbes", communes: ["Tarbes", "Lourdes", "Aureilhan", "Bagnères-de-Bigorre", "Ibos"], limitrophes: ["31", "32", "64"] },
  { code: "66", nom: "Pyrénées-Orientales", slug: "pyrenees-orientales", region: "occ", dans: "dans les Pyrénées-Orientales", de: "des Pyrénées-Orientales", le: "les Pyrénées-Orientales", chefLieu: "Perpignan", communes: ["Perpignan", "Canet-en-Roussillon", "Saint-Estève", "Argelès-sur-Mer", "Céret"], limitrophes: ["09", "11"] },
  { code: "67", nom: "Bas-Rhin", slug: "bas-rhin", region: "ge", dans: "dans le Bas-Rhin", de: "du Bas-Rhin", le: "le Bas-Rhin", chefLieu: "Strasbourg", communes: ["Strasbourg", "Haguenau", "Schiltigheim", "Illkirch-Graffenstaden", "Sélestat"], limitrophes: ["57", "68", "88"] },
  { code: "68", nom: "Haut-Rhin", slug: "haut-rhin", region: "ge", dans: "dans le Haut-Rhin", de: "du Haut-Rhin", le: "le Haut-Rhin", chefLieu: "Colmar", communes: ["Colmar", "Mulhouse", "Saint-Louis", "Illzach", "Wittenheim"], limitrophes: ["67", "70", "88", "90"] },
  { code: "69", nom: "Rhône", slug: "rhone", region: "ara", dans: "dans le Rhône", de: "du Rhône", le: "le Rhône", chefLieu: "Lyon", communes: ["Lyon", "Villeurbanne", "Vénissieux", "Caluire-et-Cuire", "Bron", "Villefranche-sur-Saône"], limitrophes: ["01", "38", "42", "71"] },
  { code: "70", nom: "Haute-Saône", slug: "haute-saone", region: "bfc", dans: "en Haute-Saône", de: "de la Haute-Saône", le: "la Haute-Saône", chefLieu: "Vesoul", communes: ["Vesoul", "Héricourt", "Lure", "Luxeuil-les-Bains", "Gray"], limitrophes: ["21", "25", "39", "52", "68", "88", "90"] },
  { code: "71", nom: "Saône-et-Loire", slug: "saone-et-loire", region: "bfc", dans: "en Saône-et-Loire", de: "de Saône-et-Loire", le: "la Saône-et-Loire", chefLieu: "Mâcon", communes: ["Mâcon", "Chalon-sur-Saône", "Le Creusot", "Montceau-les-Mines", "Autun"], limitrophes: ["01", "03", "21", "39", "42", "58", "69"] },
  { code: "72", nom: "Sarthe", slug: "sarthe", region: "pdl", dans: "dans la Sarthe", de: "de la Sarthe", le: "la Sarthe", chefLieu: "Le Mans", communes: ["Le Mans", "La Flèche", "Sablé-sur-Sarthe", "Allonnes", "Changé"], limitrophes: ["28", "37", "41", "49", "53", "61"] },
  { code: "73", nom: "Savoie", slug: "savoie", region: "ara", dans: "en Savoie", de: "de la Savoie", le: "la Savoie", chefLieu: "Chambéry", communes: ["Chambéry", "Aix-les-Bains", "Albertville", "La Motte-Servolex", "Saint-Jean-de-Maurienne"], limitrophes: ["01", "05", "38", "74"] },
  { code: "74", nom: "Haute-Savoie", slug: "haute-savoie", region: "ara", dans: "en Haute-Savoie", de: "de la Haute-Savoie", le: "la Haute-Savoie", chefLieu: "Annecy", communes: ["Annecy", "Thonon-les-Bains", "Annemasse", "Cluses", "Sallanches"], limitrophes: ["01", "73"] },
  { code: "75", nom: "Paris", slug: "paris", region: "idf", dans: "à Paris", de: "de Paris", le: "Paris", chefLieu: "Paris", communes: ["Paris"], limitrophes: ["92", "93", "94"] },
  { code: "76", nom: "Seine-Maritime", slug: "seine-maritime", region: "nor", dans: "en Seine-Maritime", de: "de Seine-Maritime", le: "la Seine-Maritime", chefLieu: "Rouen", communes: ["Rouen", "Le Havre", "Dieppe", "Sotteville-lès-Rouen", "Fécamp"], limitrophes: ["27", "60", "80"] },
  { code: "77", nom: "Seine-et-Marne", slug: "seine-et-marne", region: "idf", dans: "en Seine-et-Marne", de: "de Seine-et-Marne", le: "la Seine-et-Marne", chefLieu: "Melun", communes: ["Melun", "Meaux", "Chelles", "Pontault-Combault", "Savigny-le-Temple"], limitrophes: ["02", "10", "45", "51", "60", "89", "91", "93", "94", "95"] },
  { code: "78", nom: "Yvelines", slug: "yvelines", region: "idf", dans: "dans les Yvelines", de: "des Yvelines", le: "les Yvelines", chefLieu: "Versailles", communes: ["Versailles", "Sartrouville", "Mantes-la-Jolie", "Saint-Germain-en-Laye", "Poissy"], limitrophes: ["27", "28", "91", "92", "95"] },
  { code: "79", nom: "Deux-Sèvres", slug: "deux-sevres", region: "na", dans: "dans les Deux-Sèvres", de: "des Deux-Sèvres", le: "les Deux-Sèvres", chefLieu: "Niort", communes: ["Niort", "Bressuire", "Thouars", "Parthenay", "Saint-Maixent-l'École"], limitrophes: ["16", "17", "49", "85", "86"] },
  { code: "80", nom: "Somme", slug: "somme", region: "hdf", dans: "dans la Somme", de: "de la Somme", le: "la Somme", chefLieu: "Amiens", communes: ["Amiens", "Abbeville", "Albert", "Montdidier", "Péronne"], limitrophes: ["02", "60", "62", "76"] },
  { code: "81", nom: "Tarn", slug: "tarn", region: "occ", dans: "dans le Tarn", de: "du Tarn", le: "le Tarn", chefLieu: "Albi", communes: ["Albi", "Castres", "Gaillac", "Graulhet", "Mazamet"], limitrophes: ["11", "12", "31", "34", "82"] },
  { code: "82", nom: "Tarn-et-Garonne", slug: "tarn-et-garonne", region: "occ", dans: "en Tarn-et-Garonne", de: "de Tarn-et-Garonne", le: "le Tarn-et-Garonne", chefLieu: "Montauban", communes: ["Montauban", "Castelsarrasin", "Moissac", "Caussade", "Valence-d'Agen"], limitrophes: ["12", "31", "32", "46", "47", "81"] },
  { code: "83", nom: "Var", slug: "var", region: "paca", dans: "dans le Var", de: "du Var", le: "le Var", chefLieu: "Toulon", communes: ["Toulon", "La Seyne-sur-Mer", "Hyères", "Fréjus", "Draguignan", "Saint-Raphaël"], limitrophes: ["04", "06", "13"] },
  { code: "84", nom: "Vaucluse", slug: "vaucluse", region: "paca", dans: "dans le Vaucluse", de: "du Vaucluse", le: "le Vaucluse", chefLieu: "Avignon", communes: ["Avignon", "Orange", "Carpentras", "Cavaillon", "L'Isle-sur-la-Sorgue"], limitrophes: ["04", "07", "13", "26", "30"] },
  { code: "85", nom: "Vendée", slug: "vendee", region: "pdl", dans: "en Vendée", de: "de la Vendée", le: "la Vendée", chefLieu: "La Roche-sur-Yon", communes: ["La Roche-sur-Yon", "Les Sables-d'Olonne", "Challans", "Fontenay-le-Comte", "Saint-Hilaire-de-Riez"], limitrophes: ["17", "44", "49", "79"] },
  { code: "86", nom: "Vienne", slug: "vienne", region: "na", dans: "dans la Vienne", de: "de la Vienne", le: "la Vienne", chefLieu: "Poitiers", communes: ["Poitiers", "Châtellerault", "Buxerolles", "Chasseneuil-du-Poitou", "Loudun"], limitrophes: ["16", "36", "37", "49", "79", "87"] },
  { code: "87", nom: "Haute-Vienne", slug: "haute-vienne", region: "na", dans: "en Haute-Vienne", de: "de la Haute-Vienne", le: "la Haute-Vienne", chefLieu: "Limoges", communes: ["Limoges", "Saint-Junien", "Panazol", "Isle", "Couzeix"], limitrophes: ["16", "19", "23", "24", "36", "86"] },
  { code: "88", nom: "Vosges", slug: "vosges", region: "ge", dans: "dans les Vosges", de: "des Vosges", le: "les Vosges", chefLieu: "Épinal", communes: ["Épinal", "Saint-Dié-des-Vosges", "Gérardmer", "Remiremont", "Golbey"], limitrophes: ["52", "54", "55", "57", "67", "68", "70"] },
  { code: "89", nom: "Yonne", slug: "yonne", region: "bfc", dans: "dans l'Yonne", de: "de l'Yonne", le: "l'Yonne", chefLieu: "Auxerre", communes: ["Auxerre", "Sens", "Joigny", "Avallon", "Migennes"], limitrophes: ["10", "21", "45", "58", "77"] },
  { code: "90", nom: "Territoire de Belfort", slug: "territoire-de-belfort", region: "bfc", dans: "dans le Territoire de Belfort", de: "du Territoire de Belfort", le: "le Territoire de Belfort", chefLieu: "Belfort", communes: ["Belfort", "Delle", "Beaucourt", "Valdoie", "Giromagny"], limitrophes: ["25", "68", "70"] },
  { code: "91", nom: "Essonne", slug: "essonne", region: "idf", dans: "dans l'Essonne", de: "de l'Essonne", le: "l'Essonne", chefLieu: "Évry-Courcouronnes", communes: ["Évry-Courcouronnes", "Massy", "Corbeil-Essonnes", "Savigny-sur-Orge", "Palaiseau"], limitrophes: ["28", "45", "77", "78", "92", "94"] },
  { code: "92", nom: "Hauts-de-Seine", slug: "hauts-de-seine", region: "idf", dans: "dans les Hauts-de-Seine", de: "des Hauts-de-Seine", le: "les Hauts-de-Seine", chefLieu: "Nanterre", communes: ["Nanterre", "Boulogne-Billancourt", "Courbevoie", "Colombes", "Asnières-sur-Seine", "Rueil-Malmaison"], limitrophes: ["75", "78", "91", "93", "94", "95"] },
  { code: "93", nom: "Seine-Saint-Denis", slug: "seine-saint-denis", region: "idf", dans: "en Seine-Saint-Denis", de: "de Seine-Saint-Denis", le: "la Seine-Saint-Denis", chefLieu: "Bobigny", communes: ["Bobigny", "Saint-Denis", "Montreuil", "Aubervilliers", "Aulnay-sous-Bois", "Pantin"], limitrophes: ["75", "77", "92", "94", "95"] },
  { code: "94", nom: "Val-de-Marne", slug: "val-de-marne", region: "idf", dans: "dans le Val-de-Marne", de: "du Val-de-Marne", le: "le Val-de-Marne", chefLieu: "Créteil", communes: ["Créteil", "Vitry-sur-Seine", "Champigny-sur-Marne", "Saint-Maur-des-Fossés", "Ivry-sur-Seine"], limitrophes: ["75", "77", "91", "92", "93"] },
  { code: "95", nom: "Val-d'Oise", slug: "val-d-oise", region: "idf", dans: "dans le Val-d'Oise", de: "du Val-d'Oise", le: "le Val-d'Oise", chefLieu: "Cergy", communes: ["Cergy", "Argenteuil", "Sarcelles", "Franconville", "Garges-lès-Gonesse", "Pontoise"], limitrophes: ["27", "60", "77", "78", "92", "93"] },
  { code: "971", nom: "Guadeloupe", slug: "guadeloupe", region: "gua", dans: "en Guadeloupe", de: "de la Guadeloupe", le: "la Guadeloupe", chefLieu: "Basse-Terre", communes: ["Basse-Terre", "Les Abymes", "Pointe-à-Pitre", "Le Gosier", "Sainte-Anne"], limitrophes: [] },
  { code: "972", nom: "Martinique", slug: "martinique", region: "mar", dans: "en Martinique", de: "de la Martinique", le: "la Martinique", chefLieu: "Fort-de-France", communes: ["Fort-de-France", "Le Lamentin", "Le Robert", "Schoelcher", "Sainte-Marie"], limitrophes: [] },
  { code: "973", nom: "Guyane", slug: "guyane", region: "guy", dans: "en Guyane", de: "de la Guyane", le: "la Guyane", chefLieu: "Cayenne", communes: ["Cayenne", "Saint-Laurent-du-Maroni", "Matoury", "Kourou", "Remire-Montjoly"], limitrophes: [] },
  { code: "974", nom: "La Réunion", slug: "la-reunion", region: "reu", dans: "à La Réunion", de: "de La Réunion", le: "La Réunion", chefLieu: "Saint-Denis", communes: ["Saint-Denis", "Saint-Paul", "Saint-Pierre", "Le Tampon", "Saint-André"], limitrophes: [] },
  { code: "976", nom: "Mayotte", slug: "mayotte", region: "may", dans: "à Mayotte", de: "de Mayotte", le: "Mayotte", chefLieu: "Mamoudzou", communes: ["Mamoudzou", "Koungou", "Dzaoudzi", "Dembeni", "Bandraboua"], limitrophes: [] },
];

/** Accès par code, pour les pages et le prérendu. */
export const DEPARTEMENT_PAR_CODE: Record<string, Departement> = Object.fromEntries(
  DEPARTEMENTS.map((d) => [d.code, d]),
);

/** Accès par segment d'URL : « rhone-69 » → le Rhône. */
export const CHEMIN_DEPARTEMENT = (d: Departement) => `/carte-grise/${d.slug}-${d.code.toLowerCase()}`;

export const DEPARTEMENT_PAR_CHEMIN: Record<string, Departement> = Object.fromEntries(
  DEPARTEMENTS.map((d) => [`${d.slug}-${d.code.toLowerCase()}`, d]),
);

export const DEPARTEMENTS_DE_REGION = (cle: string): Departement[] =>
  DEPARTEMENTS.filter((d) => d.region === cle);
