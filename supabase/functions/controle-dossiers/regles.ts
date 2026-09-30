// Les règles de contrôle, à partir de ce qui a été lu sur chaque pièce.
//
// Elles reprennent la check-list d'un dossier SIV : identité du titulaire,
// justificatif de domicile, pièces du véhicule, mandat, qualité des documents.
// Tout est pur (aucun accès réseau ni base) pour rester vérifiable.

export type Gravite = "haute" | "moyenne" | "basse";

export interface Anomalie {
  code: string;
  gravite: Gravite;
  message: string;
  piece?: string;
  document_id?: string;
}

// Ce que le modèle renvoie pour une pièce. Tout est facultatif : une pièce
// illisible ne renseigne presque rien, et c'est une information en soi.
export interface Extraction {
  type_document?: string | null;
  correspond?: boolean | null;
  lisible?: boolean | null;
  defauts?: string[] | null;
  immatriculations?: string[] | null;
  vin?: string | null;
  personnes?: { role?: string; nom?: string; prenom?: string; adresse?: string }[] | null;
  dates?: {
    emission?: string | null;
    validite?: string | null;
    mise_en_circulation?: string | null;
    cession?: string | null;
    heure_cession?: string | null;
  } | null;
  signatures?: { vendeur?: boolean; acheteur?: boolean; mandant?: boolean; tampon?: boolean } | null;
  mentions?: { cede_le?: boolean; barree?: boolean } | null;
  version_cerfa?: string | null;
  face?: string | null;
  champs_incomplets?: string[] | null;
  ratures?: boolean | null;
  siret?: string | null;
  remarque?: string | null;
}

export interface Piece {
  document_id: string;
  type_document: string;
  libelle: string;
  nom_fichier: string;
  taille_octets: number | null;
  empreinte?: string | null;
  extraction?: Extraction | null;
}

export interface ContexteDossier {
  type: string;
  immatriculation?: string | null;
  vin?: string | null;
  date_mec?: string | null;
  client_nom?: string | null;
  client_prenom?: string | null;
  client_adresse?: string | null;
  mandat_data?: Record<string, unknown> | null;
}

const JOUR = 24 * 60 * 60 * 1000;

export function sansAccent(valeur: string): string {
  return valeur.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function normalisePlaque(valeur: string): string {
  return sansAccent(valeur).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// Particules et titres : présents sur une pièce, absents sur une autre, ils
// feraient croire à une différence de nom là où il n'y en a pas.
const MOTS_VIDES = new Set(["DE", "DU", "DES", "LA", "LE", "LES", "M", "MME", "MR", "MLLE", "EPOUSE", "NEE", "VEUVE"]);

export function motsDuNom(valeur: string): string[] {
  return sansAccent(valeur)
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter((mot) => mot.length >= 3 && !MOTS_VIDES.has(mot));
}

// Deux écritures d'un même nom partagent toujours au moins un mot significatif.
// On ne signale donc que l'absence totale de recoupement : un second prénom ou
// un nom d'usage en plus ne déclenche rien.
export function memePersonne(a: string, b: string): boolean {
  const motsA = motsDuNom(a);
  const motsB = motsDuNom(b);
  if (motsA.length === 0 || motsB.length === 0) return true;
  return motsA.some((mot) => motsB.includes(mot));
}

export function codePostal(adresse: string): string | null {
  const trouve = sansAccent(adresse).match(/\b(\d{5})\b/);
  return trouve ? trouve[1] : null;
}

export function numeroRue(adresse: string): string | null {
  const trouve = sansAccent(adresse).trim().match(/^(\d{1,4})\b/);
  return trouve ? trouve[1] : null;
}

// Deux adresses sont jugées différentes seulement sur un écart net : code postal
// ou numéro de rue. Le reste (abréviations, compléments d'adresse) varie trop
// d'un document à l'autre pour en tirer quoi que ce soit.
export function memeAdresse(a: string, b: string): boolean {
  const cpA = codePostal(a);
  const cpB = codePostal(b);
  if (cpA && cpB && cpA !== cpB) return false;
  const nA = numeroRue(a);
  const nB = numeroRue(b);
  if (nA && nB && nA !== nB) return false;
  return true;
}

// Écart entre deux chaînes, plafonné : au-delà de la limite, inutile de
// continuer à compter.
export function ecart(a: string, b: string, limite: number): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > limite) return limite + 1;
  let precedent = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const courant = [i];
    let minimum = i;
    for (let j = 1; j <= b.length; j++) {
      const valeur = a[i - 1] === b[j - 1]
        ? precedent[j - 1]
        : 1 + Math.min(precedent[j - 1], precedent[j], courant[j - 1]);
      courant.push(valeur);
      if (valeur < minimum) minimum = valeur;
    }
    if (minimum > limite) return limite + 1;
    precedent = courant;
  }
  return precedent[b.length];
}

// Un VIN comporte 17 caractères où le 8 et le B, le 0 et le O, le 5 et le S se
// confondent à la lecture. Sur de vrais dossiers, deux lectures d'un même VIN
// s'écartent couramment de trois caractères. Au-delà on signale, mais sans en
// faire une certitude : deux véhicules d'un même modèle partagent eux aussi
// leurs premiers caractères, et rien ne permet de trancher à coup sûr. C'est la
// plaque, courte et structurée, qui dit de façon fiable si la pièce concerne un
// autre véhicule.
const ECART_VIN = 3;

export function vinsDifferents(a: string, b: string): boolean {
  return ecart(a, b, ECART_VIN) > ECART_VIN;
}

function enDate(valeur?: string | null): Date | null {
  if (!valeur) return null;
  const date = new Date(valeur);
  return Number.isNaN(date.getTime()) ? null : date;
}

function joursDepuis(valeur: string | null | undefined, reference: Date): number | null {
  const date = enDate(valeur);
  if (!date) return null;
  return Math.floor((reference.getTime() - date.getTime()) / JOUR);
}

// Durée de validité attendue selon la nature de la pièce, en jours.
const FRAICHEUR: { motif: RegExp; jours: number; nom: string }[] = [
  { motif: /non.?gage|situation administrative/i, jours: 15, nom: "Le certificat de non-gage" },
  { motif: /domicile|quittance|facture (edf|energie)/i, jours: 92, nom: "Le justificatif de domicile" },
  { motif: /kbis/i, jours: 183, nom: "L'extrait Kbis" },
  { motif: /controle technique|contrôle technique/i, jours: 183, nom: "Le contrôle technique" },
];

// Documents qui se valent pour une même pièce demandée.
//
// Un achat aux enchères se justifie par le certificat du commissaire-priseur et
// non par un cerfa de cession ; un accusé d'enregistrement ANTS vaut preuve de
// la cession ; un passeport ou un permis valent pièce d'identité. Sans cette
// table, le contrôle reproche une « mauvaise pièce » là où le garage a déposé
// le bon document.
const FAMILLES: { motif: RegExp; acceptes: string[] }[] = [
  {
    motif: /identit|passeport|titre de s[ée]jour|permis/i,
    acceptes: ["carte_identite", "passeport", "titre_sejour", "permis_conduire"],
  },
  {
    motif: /cession/i,
    acceptes: ["certificat_cession", "accuse_enregistrement_cession", "certificat_vente_publique"],
  },
  {
    motif: /d[ée]claration d.achat|13751/i,
    acceptes: ["declaration_achat", "accuse_enregistrement_achat", "certificat_vente_publique"],
  },
  { motif: /carte grise|certificat d.immatriculation/i, acceptes: ["carte_grise"] },
  { motif: /mandat/i, acceptes: ["mandat"] },
  { motif: /non.?gage|situation administrative/i, acceptes: ["certificat_non_gage"] },
  { motif: /domicile|quittance/i, acceptes: ["justificatif_domicile"] },
  { motif: /assurance/i, acceptes: ["attestation_assurance"] },
  { motif: /kbis/i, acceptes: ["kbis"] },
  { motif: /contr[ôo]le technique/i, acceptes: ["controle_technique"] },
];

// true quand le document lu ne peut en aucun cas tenir lieu de la pièce
// demandée. Un libellé qu'aucune famille ne reconnaît ne permet de rien
// conclure : on s'en remet alors au jugement du modèle.
export function horsSujet(libelle: string, typeDetecte?: string | null, correspond?: boolean | null): boolean {
  const famille = FAMILLES.find((f) => f.motif.test(libelle));
  if (!famille) return correspond === false;
  if (!typeDetecte || typeDetecte === "illisible") return false;
  return !famille.acceptes.includes(typeDetecte);
}

// Pièces que le garage ajoute de lui-même, sous un intitulé qu'il choisit
// (« Ci », « photo », « doc 2 »…). Aucun libellé de référence à leur opposer :
// leur reprocher de ne pas correspondre n'aurait aucun sens.
export function estPieceLibre(typeDocument: string): boolean {
  return typeDocument.startsWith("autre_piece")
    || typeDocument.startsWith("correction")
    || typeDocument.startsWith("demande_");
}

// Un défaut d'image ne compte que s'il coûte une information.
//
// Règle donnée par l'exploitante le 30/09/2026 : une carte grise coupée n'est
// pas un problème tant qu'on a tous les renseignements. Le cas qui l'a fait
// trancher : une carte grise signalée « coupée » alors que la plaque, le VIN,
// la mention « cédé le » et la barre y étaient tous lisibles. Le SIV ne demande
// pas un cadrage parfait, il demande des informations.
//
// Les défauts restent donc affichés — ils expliquent pourquoi une pièce est
// difficile à lire — mais en information seulement. Ils ne pèsent sur le verdict
// que dans un cas : quand la pièce n'a rien livré du tout.
const LIBELLE_DEFAUT: Record<string, string> = {
  doigt: "un doigt masque une partie du document",
  tronque: "elle est coupée",
  sombre: "elle est trop sombre",
  flou: "elle est floue",
  reflet: "un reflet masque une partie du document",
};

// La pièce a-t-elle livré quelque chose d'exploitable ? Une plaque, un numéro de
// série, une identité, une date : n'importe lequel suffit à dire que le défaut
// d'image n'a pas empêché de lire.
export function aLivreDesInformations(ex: Extraction): boolean {
  if ((ex.immatriculations ?? []).length > 0) return true;
  if (ex.vin) return true;
  if ((ex.personnes ?? []).some((p) => p.nom || p.prenom || p.adresse)) return true;
  const dates = ex.dates ?? {};
  if (Object.values(dates).some(Boolean)) return true;
  if (ex.siret) return true;
  return false;
}

// Version du cerfa attendue, lue dans le libellé de la pièce : le site y écrit
// déjà « cerfa 13751*02 », « cerfa 15776*01 ». Comparer la version imprimée sur
// le document à celle-là évite d'inscrire dans le code des numéros qui
// changeront, et suit automatiquement les mises à jour du libellé.
export function versionAttendue(libelle: string): { numero: string; version: number } | null {
  const trouve = libelle.match(/(\d{4,5})\s*\*\s*(\d{1,2})/);
  return trouve ? { numero: trouve[1], version: Number(trouve[2]) } : null;
}

export function versionLue(valeur?: string | null): { numero: string; version: number } | null {
  if (!valeur) return null;
  const trouve = valeur.match(/(\d{4,5})\s*\*\s*(\d{1,2})/);
  return trouve ? { numero: trouve[1], version: Number(trouve[2]) } : null;
}

// Contrôles d'une pièce prise isolément.
export function anomaliesPiece(piece: Piece, contexte: ContexteDossier, maintenant: Date): Anomalie[] {
  const anomalies: Anomalie[] = [];
  const ex = piece.extraction;
  const ajoute = (code: string, gravite: Gravite, message: string) =>
    anomalies.push({ code, gravite, message, piece: piece.libelle, document_id: piece.document_id });

  if (/\.(heic|heif)$/i.test(piece.nom_fichier)) {
    ajoute("format_illisible", "haute", "Photo iPhone au format HEIC : elle ne s'ouvre pas, il faut la redemander en JPG ou en PDF.");
    return anomalies;
  }

  if (piece.taille_octets !== null && piece.taille_octets < 15_000) {
    ajoute("fichier_trop_leger", "haute", "Le fichier est minuscule : la pièce est vide ou tronquée.");
  }

  if (!ex) return anomalies;

  if (ex.lisible === false) {
    ajoute("illisible", "haute", "La pièce n'est pas lisible.");
  }

  const aLu = aLivreDesInformations(ex);
  for (const defaut of ex.defauts ?? []) {
    const texte = LIBELLE_DEFAUT[defaut];
    if (!texte) continue;
    if (aLu) {
      ajoute(`qualite_${defaut}`, "basse", `Pour information : ${texte}, mais les renseignements y sont.`);
    } else {
      ajoute(`qualite_${defaut}`, "moyenne", `À renvoyer : ${texte}, et rien n'a pu en être lu.`);
    }
  }

  if (!estPieceLibre(piece.type_document) && horsSujet(piece.libelle, ex.type_document, ex.correspond)) {
    const lu = ex.type_document ? ` (document lu : ${ex.type_document.replace(/_/g, " ")})` : "";
    ajoute("mauvaise_piece", "haute", `Ce n'est pas la pièce demandée${lu}.`);
  }

  // La mention « cédé le » et la barre sur la carte grise : c'est le geste qui
  // acte la vente. Une carte grise intacte est le bon document mais pas la bonne
  // pièce — ce n'est pas une erreur de dépôt, cela mérite son propre message.
  // Le verso ne porte pas cette mention : on ne la cherche que sur le recto.
  const attendCession = /barr[ée]|c[ée]d[ée] le/i.test(piece.libelle) && !piece.type_document.endsWith("_verso");
  if (attendCession && ex.mentions?.cede_le === false) {
    ajoute(
      "cession_non_portee",
      "moyenne",
      "La carte grise ne semble pas porter la mention « cédé le » : à confirmer à l'œil.",
    );
  }

  // Véhicule : une plaque ou un VIN lus sur la pièce et qui ne sont pas ceux du
  // dossier, c'est la pièce d'un autre véhicule — le motif de refus le plus
  // coûteux, parce qu'il n'apparaît qu'au moment de la saisie sur le SIV.
  const plaqueDossier = contexte.immatriculation ? normalisePlaque(contexte.immatriculation) : null;
  const plaquesLues = (ex.immatriculations ?? []).map(normalisePlaque).filter(Boolean);
  if (plaqueDossier && plaquesLues.length > 0 && !plaquesLues.includes(plaqueDossier)) {
    ajoute(
      "plaque_differente",
      "haute",
      `La plaque lue sur la pièce (${plaquesLues.join(", ")}) n'est pas celle du dossier (${contexte.immatriculation}).`,
    );
  }

  const vinDossier = contexte.vin ? contexte.vin.toUpperCase().replace(/\s/g, "") : null;
  const vinLu = ex.vin ? ex.vin.toUpperCase().replace(/\s/g, "") : null;
  if (vinDossier && vinLu && vinLu.length >= 15 && vinsDifferents(vinLu, vinDossier)) {
    ajoute("vin_different", "moyenne", `Le VIN lu (${vinLu}) ne correspond pas à celui du dossier (${vinDossier}). À confirmer à l'œil, ce peut être une erreur de lecture.`);
  }

  // Validité et fraîcheur.
  const finValidite = enDate(ex.dates?.validite);
  if (finValidite && finValidite.getTime() < maintenant.getTime()) {
    ajoute("piece_perimee", "haute", `La pièce est périmée depuis le ${finValidite.toLocaleDateString("fr-FR")}.`);
  }

  for (const regle of FRAICHEUR) {
    if (!regle.motif.test(piece.libelle)) continue;
    const age = joursDepuis(ex.dates?.emission, maintenant);
    if (age !== null && age > regle.jours) {
      ajoute("piece_trop_ancienne", "moyenne", `${regle.nom} date de ${age} jours, la limite est de ${regle.jours} jours.`);
    }
  }

  // Signatures et champs laissés vides : le deuxième motif de refus en volume.
  const estCession = /cession/i.test(piece.libelle);
  const estMandat = /mandat/i.test(piece.libelle);
  if (estCession && ex.signatures) {
    if (ex.signatures.vendeur === false) ajoute("signature_manquante", "haute", "Le certificat de cession n'est pas signé par le vendeur.");
    if (ex.signatures.acheteur === false) ajoute("signature_manquante", "haute", "Le certificat de cession n'est pas signé par l'acheteur.");
  }
  // Sur un mandat, le signataire est le mandant : le modèle le nomme tantôt
  // « mandant », tantôt « vendeur » selon la façon dont le Cerfa est rempli.
  if (estMandat && ex.signatures) {
    const signe = ex.signatures.mandant ?? ex.signatures.vendeur;
    if (signe === false && ex.signatures.tampon !== true) {
      ajoute("mandat_non_signe", "haute", "Le mandat n'est ni signé ni tamponné.");
    }
  }

  // Le Cerfa identifie le véhicule par sa plaque OU par son VIN : réclamer le
  // VIN alors que la plaque est inscrite serait un reproche sans objet.
  const vinInutile = plaquesLues.length > 0;
  for (const champ of ex.champs_incomplets ?? []) {
    if (vinInutile && /\bvin\b|identification du v[ée]hicule/i.test(champ)) continue;
    // En information : l'heure de cession ou le kilométrage laissés vides sont
    // bien un motif de refus chez nous (69 refus sur 758), mais ils passent
    // beaucoup plus souvent qu'ils ne bloquent. Les signaler comme des points à
    // vérifier ferait sortir un dossier sur deux pour une case que l'on accepte
    // la plupart du temps.
    ajoute("champ_vide", "basse", `Champ non rempli : ${champ}.`);
  }

  // En revanche, un mandat qui ne porte ni plaque ni VIN ne désigne aucun
  // véhicule.
  if (estMandat && plaquesLues.length === 0 && !vinLu) {
    ajoute("vehicule_non_identifie", "haute", "Le mandat n'indique ni plaque ni VIN : le véhicule n'y est pas identifié.");
  }

  if (ex.ratures === true) {
    ajoute("ratures", "moyenne", "La pièce comporte des ratures ou des surcharges.");
  }

  // Un cerfa dans une version périmée est refusé au SIV. On ne compare que des
  // versions d'un même formulaire : une version plus récente que celle annoncée
  // dans le libellé est parfaitement valable, c'est l'inverse qui pose problème.
  const attendue = versionAttendue(piece.libelle);
  const lue = versionLue(ex.version_cerfa);
  if (attendue && lue && attendue.numero === lue.numero && lue.version < attendue.version) {
    ajoute(
      "cerfa_perime",
      "moyenne",
      `Le formulaire est en version ${lue.numero}*${String(lue.version).padStart(2, "0")}, alors que la version ${attendue.numero}*${String(attendue.version).padStart(2, "0")} est demandée.`,
    );
  }

  // Verso seul sur une pièce qui n'est pas l'emplacement prévu pour le verso :
  // le recto manque, et c'est lui qui porte l'identité.
  const emplacementVerso = piece.type_document.endsWith("_verso") || /verso/i.test(piece.libelle);
  if (!emplacementVerso && ex.face === "verso") {
    ajoute("recto_manquant", "moyenne", "Seul le verso est visible : il manque le recto.");
  }

  return anomalies;
}

// Contrôles qui ne se voient qu'en comparant les pièces entre elles.
export function anomaliesDossier(
  pieces: Piece[],
  manquantes: string[],
  contexte: ContexteDossier,
  depotTermine: boolean,
): Anomalie[] {
  const anomalies: Anomalie[] = [];

  // Tant que le garage dépose ses pièces, une pièce absente est normale : elle
  // n'est signalée comme manquante qu'une fois le dépôt annoncé terminé.
  for (const libelle of manquantes) {
    anomalies.push({
      code: "piece_manquante",
      gravite: depotTermine ? "haute" : "basse",
      message: depotTermine
        ? `Pièce obligatoire absente : ${libelle}.`
        : `Pas encore déposée : ${libelle}.`,
      piece: libelle,
    });
  }

  // Même fichier déposé sur deux pièces différentes.
  const parEmpreinte = new Map<string, Piece[]>();
  for (const piece of pieces) {
    if (!piece.empreinte) continue;
    const liste = parEmpreinte.get(piece.empreinte) ?? [];
    liste.push(piece);
    parEmpreinte.set(piece.empreinte, liste);
  }
  for (const liste of parEmpreinte.values()) {
    if (liste.length < 2) continue;
    anomalies.push({
      code: "fichier_duplique",
      gravite: "haute",
      message: `Le même fichier a été déposé pour ${liste.length} pièces : ${liste.map((p) => p.libelle).join(", ")}.`,
      piece: liste[0].libelle,
      document_id: liste[0].document_id,
    });
  }

  // VIN lus sur des pièces différentes. Deux lectures d'un même numéro diffèrent
  // souvent d'un caractère ou deux : seul un écart net dénonce deux véhicules.
  const vins: { vin: string; piece: string }[] = [];
  for (const piece of pieces) {
    const vin = piece.extraction?.vin?.toUpperCase().replace(/\s/g, "");
    if (vin && vin.length >= 15) vins.push({ vin, piece: piece.libelle });
  }
  for (let i = 1; i < vins.length; i++) {
    if (!vinsDifferents(vins[0].vin, vins[i].vin)) continue;
    anomalies.push({
      code: "vin_incoherent",
      gravite: "moyenne",
      message: `Deux VIN qui ne concordent pas : ${vins[0].vin} (${vins[0].piece}) et ${vins[i].vin} (${vins[i].piece}). À confirmer à l'œil, ce peut être une erreur de lecture.`,
      piece: vins[i].piece,
    });
    break;
  }

  // Identité de l'acquéreur : la pièce d'identité déposée doit être celle de
  // l'acheteur porté sur la cession.
  //
  // On ne compare que ces deux-là. Rapprocher le mandant du titulaire de la
  // carte grise n'aurait aucun sens sur une déclaration d'achat : le mandant est
  // le garage, le titulaire est le particulier qui vend. Ce sont deux personnes
  // différentes, et c'est parfaitement normal.
  const nomComplet = (p: { nom?: string; prenom?: string }) => [p.prenom, p.nom].filter(Boolean).join(" ").trim();

  const pieceIdentite = pieces.find((p) => /identit|passeport|titre de sejour|titre de séjour/i.test(p.libelle));
  const titulairePiece = pieceIdentite?.extraction?.personnes?.map(nomComplet).find(Boolean);

  const cession = pieces.find((p) => /cession/i.test(p.libelle));
  const acheteur = cession?.extraction?.personnes
    ?.filter((p) => (p.role ?? "").toLowerCase() === "acheteur")
    .map(nomComplet)
    .find(Boolean);

  if (titulairePiece && acheteur && !memePersonne(titulairePiece, acheteur)) {
    anomalies.push({
      code: "nom_different",
      gravite: "moyenne",
      message: `La pièce d'identité est au nom de « ${titulairePiece} », mais la cession désigne « ${acheteur} » comme acquéreur.`,
      piece: pieceIdentite?.libelle,
    });
  }

  // Adresse du justificatif de domicile contre celle du mandat.
  const adresseDe = (motif: RegExp): { adresse: string; piece: string } | null => {
    for (const piece of pieces) {
      if (!motif.test(piece.libelle)) continue;
      for (const personne of piece.extraction?.personnes ?? []) {
        if (personne.adresse) return { adresse: personne.adresse, piece: piece.libelle };
      }
    }
    return null;
  };
  const domicile = adresseDe(/domicile|quittance/i);
  const mandat = adresseDe(/mandat/i);
  if (domicile && mandat && !memeAdresse(domicile.adresse, mandat.adresse)) {
    anomalies.push({
      code: "adresse_differente",
      gravite: "moyenne",
      message: `L'adresse du mandat (${mandat.adresse}) ne correspond pas au justificatif de domicile (${domicile.adresse}).`,
      piece: mandat.piece,
    });
  }

  return anomalies;
}

export function niveauDossier(anomalies: Anomalie[]): "vert" | "orange" | "rouge" {
  if (anomalies.some((a) => a.gravite === "haute")) return "rouge";
  if (anomalies.some((a) => a.gravite === "moyenne")) return "orange";
  return "vert";
}
