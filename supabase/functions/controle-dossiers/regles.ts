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

// Pièces que le garage ajoute de lui-même, sous un intitulé qu'il choisit
// (« Ci », « photo », « doc 2 »…). Aucun libellé de référence à leur opposer :
// leur reprocher de ne pas correspondre n'aurait aucun sens.
export function estPieceLibre(typeDocument: string): boolean {
  return typeDocument.startsWith("autre_piece") || typeDocument.startsWith("correction");
}

const LIBELLE_DEFAUT: Record<string, string> = {
  flou: "elle est floue",
  sombre: "elle est trop sombre",
  tronque: "elle est coupée",
  reflet: "un reflet masque une partie du document",
  doigt: "un doigt masque une partie du document",
};

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
    ajoute("fichier_trop_leger", "moyenne", "Le fichier est minuscule : la pièce est probablement vide ou tronquée.");
  }

  if (!ex) return anomalies;

  if (ex.lisible === false) {
    ajoute("illisible", "haute", "La pièce n'est pas lisible.");
  }

  for (const defaut of ex.defauts ?? []) {
    const texte = LIBELLE_DEFAUT[defaut];
    if (texte) {
      ajoute(`qualite_${defaut}`, defaut === "tronque" ? "haute" : "moyenne", `À renvoyer : ${texte}.`);
    }
  }

  if (ex.correspond === false && !estPieceLibre(piece.type_document)) {
    const lu = ex.type_document ? ` (document lu : ${ex.type_document.replace(/_/g, " ")})` : "";
    ajoute("mauvaise_piece", "haute", `Ce n'est pas la pièce demandée${lu}.`);
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
  if (vinDossier && vinLu && vinLu.length >= 15 && vinLu !== vinDossier) {
    ajoute("vin_different", "haute", `Le VIN lu (${vinLu}) ne correspond pas à celui du dossier (${vinDossier}).`);
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

  for (const champ of ex.champs_incomplets ?? []) {
    ajoute("champ_vide", "moyenne", `Champ non rempli : ${champ}.`);
  }

  if (ex.ratures === true) {
    ajoute("ratures", "moyenne", "La pièce comporte des ratures ou des surcharges.");
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

  // VIN lus sur des pièces différentes qui ne se recoupent pas.
  const vins = new Map<string, string>();
  for (const piece of pieces) {
    const vin = piece.extraction?.vin?.toUpperCase().replace(/\s/g, "");
    if (vin && vin.length >= 15) vins.set(vin, piece.libelle);
  }
  if (vins.size > 1) {
    anomalies.push({
      code: "vin_incoherent",
      gravite: "haute",
      message: `Deux VIN différents dans le dossier : ${[...vins.entries()].map(([vin, où]) => `${vin} (${où})`).join(" / ")}.`,
    });
  }

  // Identité : le nom du titulaire doit être le même partout.
  const identites: { nom: string; piece: string }[] = [];
  for (const piece of pieces) {
    for (const personne of piece.extraction?.personnes ?? []) {
      if (!["titulaire", "acheteur", "mandant"].includes((personne.role ?? "").toLowerCase())) continue;
      const nom = [personne.prenom, personne.nom].filter(Boolean).join(" ").trim();
      if (nom) identites.push({ nom, piece: piece.libelle });
    }
  }
  for (let i = 1; i < identites.length; i++) {
    if (!memePersonne(identites[0].nom, identites[i].nom)) {
      anomalies.push({
        code: "nom_different",
        gravite: "moyenne",
        message: `Noms différents d'une pièce à l'autre : « ${identites[0].nom} » (${identites[0].piece}) et « ${identites[i].nom} » (${identites[i].piece}).`,
        piece: identites[i].piece,
      });
      break;
    }
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
