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
  // Une photo porte parfois deux pièces à la fois : une carte grise posée sur
  // une déclaration d'achat, un recto et un verso côte à côte. Le document
  // principal est dans type_document, les autres ici.
  autres_documents?: string[] | null;
  correspond?: boolean | null;
  lisible?: boolean | null;
  defauts?: string[] | null;
  immatriculations?: string[] | null;
  vin?: string | null;
  personnes?: {
    role?: string; nom?: string; prenom?: string; adresse?: string;
    /** Le cerfa coche « personne physique » ou « personne morale » : une société ne se compare pas à un nom. */
    est_une_societe?: boolean | null;
  }[] | null;
  dates?: {
    emission?: string | null;
    validite?: string | null;
    mise_en_circulation?: string | null;
    cession?: string | null;
    heure_cession?: string | null;
    naissance?: string | null;
  } | null;
  signatures?: {
    vendeur?: boolean; acheteur?: boolean; mandant?: boolean; tampon?: boolean;
    /** Deux signatures distinctes dans le cadre du vendeur : exigé quand la carte grise porte un co-titulaire. */
    second_vendeur?: boolean;
  } | null;
  /** Le document nomme deux titulaires ou deux vendeurs. */
  co_titulaire?: boolean | null;
  mentions?: { cede_le?: boolean; barree?: boolean } | null;
  face?: string | null;
  situation_administrative?: { vierge?: boolean; mentions?: string[] } | null;
  champs_incomplets?: string[] | null;
  ratures?: boolean | null;
  siret?: string | null;
  /** Le Siret du mandant seul : celui du mandataire est pré-imprimé sur le cerfa. */
  siret_mandant?: string | null;
  remarque?: string | null;
}

export interface Piece {
  document_id: string;
  type_document: string;
  libelle: string;
  nom_fichier: string;
  taille_octets: number | null;
  empreinte?: string | null;
  /**
   * Une autre face du même document porte une validité encore en cours. Les deux
   * fichiers d'une carte d'identité sont deux pièces pour le contrôle, mais un
   * seul titre : si l'un donne une date valable, la date passée lue sur l'autre
   * est une erreur de lecture, pas une péremption.
   */
  validiteAilleurs?: boolean;
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

// Une immatriculation française : deux lettres, trois chiffres, deux lettres
// depuis 2009, ou l'ancien format numéro-lettres-département. Le modèle range
// parfois dans cette rubrique le numéro de formule de la carte grise
// (« 2022AV45464») ou une suite de caractères mal lue : les comparer à la
// plaque du dossier ne prouve rien.
export function estPlaqueFrancaise(valeur: string): boolean {
  return /^[A-Z]{2}[0-9]{3}[A-Z]{2}$/.test(valeur) || /^[0-9]{1,4}[A-Z]{1,3}[0-9]{2,3}$/.test(valeur);
}

// Une plaque partiellement lue — masquée sur le document, tronquée à la prise de
// vue — sort avec des caractères en moins, dans le bon ordre : « AS4QZ » pour
// « AS-475-QZ ». C'est la même plaque mal lue, pas un autre véhicule. Une plaque
// réellement différente, elle, a des caractères qui ne collent pas.
export function lectureCompatible(lue: string, attendue: string): boolean {
  if (lue === attendue) return true;
  const [courte, longue] = lue.length <= attendue.length ? [lue, attendue] : [attendue, lue];
  if (courte.length < 3) return false;
  let i = 0;
  for (const caractere of longue) {
    if (caractere === courte[i]) i++;
    if (i === courte.length) return true;
  }
  return false;
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
// Une raison sociale n'est pas un nom de personne : le cerfa coche « personne
// morale », et le modèle le rapporte. Les lectures antérieures à cette consigne
// n'ont pas l'information, d'où ce repli sur les marques d'une société — forme
// juridique ou vocabulaire du métier. Il ne rattrape pas tout : une concession
// nommée d'après une rue ou une personne y échappe, et c'est le champ rapporté
// par le modèle qui tranche alors.
const MARQUES_DE_SOCIETE =
  /\b(SAS|SASU|SARL|EURL|SA|SCI|SNC|SELARL|SCOP|EI|EIRL)\b|\b(AUTOS?|MOTORS?|GARAGE|CONCESSION|AUTOMOBILES?|CARS?|VO|NEGOCE|DISTRIBUTION|TRUCKS?)\b/i;

export function estUneRaisonSociale(nom: string): boolean {
  return MARQUES_DE_SOCIETE.test(sansAccent(nom).toUpperCase());
}

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

// Un Siret compte quatorze chiffres, un Siren les neuf premiers. Le modèle lit
// parfois l'un là où l'autre est écrit, et un numéro mal cadré n'a ni l'une ni
// l'autre longueur : on ne compare que ce qui a la forme d'un numéro.
export function normaliseSiret(valeur: unknown): string | null {
  if (typeof valeur !== "string" && typeof valeur !== "number") return null;
  const chiffres = String(valeur).replace(/\D/g, "");
  return chiffres.length === 9 || chiffres.length === 14 ? chiffres : null;
}

// Deux numéros désignent la même entreprise quand leurs neuf premiers chiffres
// coïncident : le Siren identifie la société, les cinq derniers l'établissement.
// Un garage qui signe depuis un autre de ses établissements reste le même
// mandant.
export function memeEtablissement(a: string, b: string): boolean {
  return a.slice(0, 9) === b.slice(0, 9);
}

// Un VIN n'a que des lettres et des chiffres, et il en a toujours dix-sept.
// Tout ce qui n'a pas cette forme est une lecture ratée, pas un numéro : la
// comparer reviendrait à comparer du bruit.
export function normaliseVin(valeur: string | null | undefined): string | null {
  if (!valeur) return null;
  const propre = valeur.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return propre.length === 17 ? propre : null;
}

// Les caractères qui se ressemblent une fois imprimés en petit. Sur
// DEM-2026-08088, chaque Z d'un VIN Volkswagen avait été lu 2 : cinq écarts
// annoncés pour un seul et même véhicule. Les confondre volontairement avant de
// comparer, c'est ne laisser subsister que les vraies différences.
//
// La norme interdit I, O et Q dans un VIN : les y voir est toujours une erreur
// de lecture, jamais un caractère réel.
const CONFUSIONS: Record<string, string> = {
  O: "0", Q: "0", D: "0",
  I: "1", L: "1",
  Z: "2",
  S: "5",
  G: "6",
  B: "8",
};

function sansConfusion(vin: string): string {
  return [...vin].map((c) => CONFUSIONS[c] ?? c).join("");
}

export function vinsDifferents(a: string, b: string): boolean {
  return ecart(sansConfusion(a), sansConfusion(b), ECART_VIN) > ECART_VIN;
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
  // Six mois, comme le tableau « documents obligatoires » du guide. La liste du
  // site en réclamait trois : plus strict que le SIV, donc du travail en plus
  // pour rien.
  { motif: /domicile|quittance|facture (edf|energie)/i, jours: 183, nom: "Le justificatif de domicile" },
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
  // « Dernière DA enregistrée » : c'est le récépissé sorti du SIV qui est
  // attendu, pas le formulaire Cerfa rempli. Le guide y consacre un paragraphe :
  // pour un changement de titulaire, c'est la DA que le client doit fournir.
  {
    motif: /derni[èe]re da|r[ée]c[ée]piss[ée]|da enregistr/i,
    acceptes: ["accuse_enregistrement_achat", "declaration_achat"],
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
// Le document lu peut-il tenir lieu de la pièce demandée ? Sert à rattacher une
// pièce renvoyée après un refus à l'emplacement qu'elle vient combler : le
// garage les dépose dans des cases « correction » indifférenciées, et seul son
// contenu dit ce qu'elle remplace.
// Une plaque se lit avec ses tirets. On la compare sans, mais on l'affiche comme
// elle est écrite sur le document — « ES-949-FD » et non « ES949FD ».
// Une date se lit JJ/MM/AAAA pour qui la vérifie sur un document français.
function enFrancais(iso: string | null): string {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

// Le nom court d'une pièce, pour les phrases qui en citent plusieurs. Les
// intitulés de la configuration sont faits pour guider un dépôt — « Contrôle
// technique de moins de 6 mois (véhicule de plus de 4 ans) » — et répéter cela
// deux fois dans un constat le rend illisible.
// Les abréviations du métier, celles que l'administration emploie entre elle :
// une phrase qui dit « il manque le CT » se lit d'un coup d'œil là où « Contrôle
// technique de moins de 6 mois (véhicule de plus de 4 ans) » demande qu'on
// s'arrête. L'article est inclus pour que les phrases restent justes sans avoir
// à accorder.
//
// « CI » est volontairement absent : il désigne le certificat d'immatriculation
// dans le guide SIV et la carte d'identité dans l'usage courant. Entre les deux,
// on écrit la pièce d'identité en toutes lettres.
const ABREVIATIONS: { motif: RegExp; court: string }[] = [
  { motif: /13751|d[ée]claration d.achat/i, court: "la DA" },
  { motif: /15776|certificat de cession|d[ée]claration de cession/i, court: "la DC" },
  { motif: /contr[ôo]le technique/i, court: "le CT" },
  { motif: /carte grise|certificat d.immatriculation/i, court: "la CG" },
  { motif: /r[ée]c[ée]piss[ée]/i, court: "le récépissé de DA" },
  { motif: /non.?gage|situation administrative/i, court: "le non-gage" },
  { motif: /13757|mandat/i, court: "le mandat" },
  { motif: /kbis/i, court: "le Kbis" },
  { motif: /identit[ée] du vendeur/i, court: "la pièce d'identité du vendeur" },
  { motif: /identit[ée] de l.acqu[ée]reur|identit[ée] de l.acheteur/i, court: "la pièce d'identité de l'acquéreur" },
  { motif: /identit[ée] du dirigeant/i, court: "la pièce d'identité du dirigeant" },
  { motif: /domicile|quittance/i, court: "le justificatif de domicile" },
];

export function libelleCourt(libelle: string): string {
  const connue = ABREVIATIONS.find((a) => a.motif.test(libelle));
  if (connue) return connue.court;
  // Les pièces libres et les emplacements de correction n'ont pas d'abréviation :
  // on se contente d'élaguer ce que l'intitulé porte pour guider un dépôt.
  return libelle
    .split(/\s*[(—]/)[0]
    .replace(/\s*,.*$/, "")
    .replace(/\s+de moins de .*$/i, "")
    .replace(/\s+(sign[ée]e?|tamponn[ée]e?|dat[ée]e?)(\s+et\s+\S+)*\s*$/i, "")
    .trim();
}

export function formatePlaque(plaque: string): string {
  const m = plaque.match(/^([A-Z]{2})([0-9]{3})([A-Z]{2})$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : plaque;
}

export function appartientALaFamille(libelle: string, typeDetecte?: string | null): boolean {
  if (!typeDetecte) return false;
  const famille = FAMILLES.find((f) => f.motif.test(libelle));
  return famille ? famille.acceptes.includes(typeDetecte) : false;
}

export function horsSujet(libelle: string, typeDetecte?: string | null, correspond?: boolean | null): boolean {
  const famille = FAMILLES.find((f) => f.motif.test(libelle));
  if (!famille) return correspond === false;
  if (!typeDetecte || typeDetecte === "illisible") return false;
  return !famille.acceptes.includes(typeDetecte);
}

// Documents qui portent une vraie date de fin de validité. Tout le reste est
// daté sans expirer : on en juge la fraîcheur, pas la validité.
const PIECES_QUI_EXPIRENT = new Set([
  "carte_identite",
  "passeport",
  "titre_sejour",
  "permis_conduire",
  "attestation_assurance",
  "controle_technique",
]);

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

// Cases que le SIV exige pour enregistrer une cession ou un achat : elles
// portent une étoile sur ses écrans de saisie. Tout ce qui n'y figure pas ne
// conditionne pas l'enregistrement, et n'a donc pas à être signalé — le
// kilométrage du cerfa, par exemple, n'apparaît sur aucun des deux écrans.
const CHAMPS_SIV = /heure|date|immatricul|plaque|identification du v|\bvin\b|identit[ée]|num[ée]ro de formule/i;

// Deux exceptions, pour des raisons opposées.
//
// L'heure de cession est bien une case du SIV, mais elle figure desormais dans
// l'encadré « À vérifier vous-même » : écrite à la main dans une case minuscule,
// le modèle la déclarait vide vingt-huit fois sur quarante-cinq signalements de
// champ, et l'administration ne l'a jamais reprochée du temps du contrôle
// manuel. La signaler deux fois, dont une a tort, n'aide personne.
//
// Et quand le modèle annonce lui-même qu'une case ne s'applique pas, il ne faut
// pas la reprocher : il décrit le formulaire, il ne constate pas un oubli.
const CHAMPS_LAISSES_A_L_OEIL = /heure/i;
const CASE_SANS_OBJET = /non applicable|sans objet|n\/a/i;

export function champObligatoireSiv(champ: string): boolean {
  if (CHAMPS_LAISSES_A_L_OEIL.test(champ)) return false;
  if (CASE_SANS_OBJET.test(champ)) return false;
  return CHAMPS_SIV.test(champ);
}

// Contrôles d'une pièce prise isolément.
export function anomaliesPiece(
  piece: Piece,
  contexte: ContexteDossier,
  maintenant: Date,
  dansUnDoublon = false,
): Anomalie[] {
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

  // Les défauts d'image ne sont signalés que lorsque la pièce n'a rien livré.
  //
  // Le modèle les invente trop souvent pour qu'on les affiche autrement : sur
  // DEM-2026-08200 il a annoncé une carte grise « coupée » avec un « reflet »,
  // alors qu'elle n'avait ni l'un ni l'autre. La mesure le disait déjà — reflet
  // 31 %, flou 29 % de justesse, sous le hasard. Quand la plaque, le VIN et les
  // mentions ont été lus, le cadrage de la photo n'apprend rien à personne.
  if (!aLivreDesInformations(ex)) {
    for (const defaut of ex.defauts ?? []) {
      const texte = LIBELLE_DEFAUT[defaut];
      if (texte) ajoute(`qualite_${defaut}`, "moyenne", `À renvoyer : ${texte}, et rien n'a pu en être lu.`);
    }
  }

  // Un PDF ne passe pas par le même chemin qu'une photo : il est océrisé, et le
  // modèle n'en reçoit que le texte. Tout ce qui est écrit à la main — une
  // signature, un cachet, la mention de vente — lui est alors invisible.
  const pageVue = !/\.pdf$/i.test(piece.nom_fichier);

  // Quand le fichier a servi à deux emplacements, « ce n'est pas la bonne pièce »
  // n'ajoute rien : c'est la même histoire que le doublon, qui dit déjà laquelle
  // manque. Deux signalements pour un seul document absent brouillent la lecture.
  if (!dansUnDoublon && !estPieceLibre(piece.type_document) && horsSujet(piece.libelle, ex.type_document, ex.correspond)) {
    const lu = ex.type_document ? ` (document lu : ${ex.type_document.replace(/_/g, " ")})` : "";
    ajoute("mauvaise_piece", "haute", `Ce n'est pas la pièce demandée${lu}.`);
  }

  // La mention « cédé le » et la barre sur la carte grise : c'est le geste qui
  // acte la vente. Une carte grise intacte est le bon document mais pas la bonne
  // pièce — ce n'est pas une erreur de dépôt, cela mérite son propre message.
  // Le verso ne porte pas cette mention : on ne la cherche que sur le recto.
  // Véhicule : une plaque ou un VIN lus sur la pièce et qui ne sont pas ceux du
  // dossier, c'est la pièce d'un autre véhicule — le motif de refus le plus
  // coûteux, parce qu'il n'apparaît qu'au moment de la saisie sur le SIV.
  const plaqueDossier = contexte.immatriculation ? normalisePlaque(contexte.immatriculation) : null;
  const plaquesLues = (ex.immatriculations ?? []).map(normalisePlaque).filter(estPlaqueFrancaise);
  if (plaqueDossier && plaquesLues.length > 0 && !plaquesLues.some((p) => lectureCompatible(p, plaqueDossier))) {
    ajoute(
      "plaque_differente",
      "haute",
      `La plaque lue sur la pièce (${plaquesLues.join(", ")}) n'est pas celle du dossier (${contexte.immatriculation}).`,
    );
  }

  // Le guide SIV exige que le VIN de la carte grise soit identique à celui porté
  // sur la cession. La règle avait été retirée : sur dix-sept caractères sans
  // séparateur, un Z lu 2 et un O lu 0 produisaient quatorze désaccords
  // imaginaires sur vingt dossiers. Elle revient avec une tolérance — au-delà de
  // trois caractères d'écart, ce n'est plus une erreur de lecture, c'est un
  // autre véhicule.
  const vinDossier = normaliseVin(contexte.vin);
  const vinLu = normaliseVin(ex.vin);
  if (vinDossier && vinLu && vinsDifferents(vinLu, vinDossier)) {
    ajoute(
      "vin_different",
      "haute",
      `Le numéro de série lu sur la pièce (${vinLu}) n'est pas celui du dossier (${vinDossier}).`,
    );
  }

  // Validité et fraîcheur.
  //
  // Seuls certains documents expirent. Une carte grise, une cession, un mandat
  // n'ont pas de fin de validité : le modèle range parfois leur date d'émission
  // dans ce champ, et on annonçait alors une carte grise « périmée », ce qui ne
  // veut rien dire.
  //
  // Et sur une pièce d'identité, le modèle confond la fin de validité avec la
  // date de naissance : sur DEM-2026-05309 il a annoncé une carte « périmée
  // depuis le 20/11/2000 » alors qu'elle expire le 01/04/2035. Deux garde-fous
  // désormais : la date de naissance, qu'on lui demande séparément, n'est jamais
  // prise pour une expiration ; et aucun titre d'identité ne reste présenté
  // quinze ans après sa péremption — une date aussi ancienne est une mauvaise
  // lecture, pas une pièce périmée.
  const ANS_15 = 15 * 365.25 * JOUR;
  const finValidite = enDate(ex.dates?.validite);
  const naissance = ex.dates?.naissance ?? null;
  const confonduAvecLaNaissance = !!naissance && naissance === ex.dates?.validite;
  const tropAncienne = !!finValidite && maintenant.getTime() - finValidite.getTime() > ANS_15;

  if (
    finValidite
    && PIECES_QUI_EXPIRENT.has(ex.type_document ?? "")
    && finValidite.getTime() < maintenant.getTime()
    && !confonduAvecLaNaissance
    && !tropAncienne
    && !piece.validiteAilleurs
  ) {
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
  //
  // Un PDF ne passe pas par le même chemin qu'une photo : il est océrisé, et le
  // modèle n'en reçoit que le texte. Une signature manuscrite ou un cachet, qui
  // sont des images, lui sont alors invisibles — il répond « non signé » sur des
  // documents parfaitement signés. On ne l'interroge donc sur les signatures que
  // lorsqu'il a réellement vu la page.
  const estCession = /cession/i.test(piece.libelle);
  const estMandat = /mandat/i.test(piece.libelle);
  if (pageVue && estCession && ex.signatures) {
    if (ex.signatures.vendeur === false) ajoute("signature_manquante", "haute", "Le certificat de cession n'est pas signé par le vendeur.");
    if (ex.signatures.acheteur === false) ajoute("signature_manquante", "haute", "Le certificat de cession n'est pas signé par l'acheteur.");
  }
  // Sur un mandat, le signataire est le mandant : le modèle le nomme tantôt
  // « mandant », tantôt « vendeur » selon la façon dont le Cerfa est rempli.
  if (pageVue && estMandat && ex.signatures) {
    const signe = ex.signatures.mandant ?? ex.signatures.vendeur;
    if (signe === false && ex.signatures.tampon !== true) {
      ajoute("mandat_non_signe", "haute", "Le mandat n'est ni signé ni tamponné.");
    }
  }

  // « Vérifier la cohérence du Siret » : le mandat d'une société doit porter le
  // Siret de cette société. Un Siret qui ne correspond pas, c'est un mandat
  // signé par quelqu'un d'autre — le SIV le refuse à la saisie, et c'est
  // exactement ce qu'un contrôle de préfecture regarde.
  if (estMandat) {
    const siretDossier = normaliseSiret(contexte.mandat_data?.mandant_siret);
    const siretLu = normaliseSiret(ex.siret_mandant);
    if (siretDossier && siretLu && !memeEtablissement(siretLu, siretDossier)) {
      ajoute(
        "siret_different",
        "haute",
        `Le Siret porté sur le mandat (${siretLu}) n'est pas celui du mandant (${siretDossier}).`,
      );
    }
  }

  // Le Cerfa identifie le véhicule par sa plaque OU par son VIN : réclamer le
  // VIN alors que la plaque est inscrite serait un reproche sans objet.
  // Les cases obligatoires ne se reprochent qu'aux formulaires qui en portent.
  // Une carte grise n'a pas d'« heure de cession » : le modèle y appliquait les
  // rubriques du cerfa et réclamait une case qui n'existe pas.
  const PORTE_DES_CASES = new Set(["certificat_cession", "declaration_achat", "mandat", "demande_immatriculation"]);
  const vinInutile = plaquesLues.length > 0;
  for (const champ of (PORTE_DES_CASES.has(ex.type_document ?? "") ? ex.champs_incomplets ?? [] : [])) {
    if (vinInutile && /\bvin\b|identification du v[ée]hicule/i.test(champ)) continue;
    // Sur un PDF, une case « signature » vide ne veut rien dire : le modèle lit
    // le texte, pas l'encre. Annoncer qu'elle manque revient à accuser au
    // hasard des documents parfaitement signés.
    if (!pageVue && /signature|cachet|tampon/i.test(champ)) continue;
    // Toutes les cases vides ne se valent pas. Les écrans « Inscrire la cession »
    // et « Inscrire l'achat » du SIV marquent d'une étoile la date, l'heure, la
    // plaque et le numéro d'identification : sans elles, l'opérateur ne peut pas
    // valider l'écran, et il faudra de toute façon rappeler le garage. Le
    // kilométrage ou une mention de confort, eux, n'empêchent rien : ils
    // s'affichent pour information.
    // Une case que le SIV ne réclame pas n'est pas signalée du tout. Le
    // kilométrage, le SIRET d'un particulier, une commune incomplète : ces
    // mentions figurent sur le cerfa sans conditionner l'enregistrement. Les
    // afficher, même en information, revient à faire lire du bruit.
    if (!champObligatoireSiv(champ)) continue;
    ajoute("champ_vide", "moyenne", `Champ non rempli : ${champ}.`);
  }

  // En revanche, un mandat qui ne porte ni plaque ni VIN ne désigne aucun
  // véhicule.
  if (estMandat && plaquesLues.length === 0 && !ex.vin) {
    ajoute("vehicule_non_identifie", "haute", "Le mandat n'indique ni plaque ni VIN : le véhicule n'y est pas identifié.");
  }

  if (ex.ratures === true) {
    ajoute("ratures", "moyenne", "La pièce comporte des ratures ou des surcharges.");
  }

  // La date de vente est une case étoilée des écrans du SIV : sans elle,
  // l'opérateur ne peut pas enregistrer la démarche. Sur un certificat de
  // cession comme sur une déclaration d'achat, elle doit être portée.
  const porteLaVente = /cession|15776|d[ée]claration d.achat|13751/i.test(piece.libelle);
  if (porteLaVente && ex.lisible !== false && !ex.dates?.cession) {
    ajoute(
      "date_vente_absente",
      "moyenne",
      "Aucune date de vente n'est lisible sur la pièce : le SIV la réclame pour enregistrer la démarche.",
    );
  }

  // Le certificat de situation administrative ne vaut que s'il est vierge. Une
  // opposition, un gage, une saisie, une immatriculation suspendue ou un
  // certificat déclaré perdu arrêtent la démarche au SIV, et c'est justement ce
  // que la pièce sert à prouver.
  const estNonGage = /non.?gage|situation administrative/i.test(piece.libelle)
    || ex.type_document === "certificat_non_gage";
  if (estNonGage && ex.situation_administrative?.vierge === false) {
    const mentions = (ex.situation_administrative.mentions ?? []).filter(Boolean);
    // Le guide ne retient que trois motifs d'arrêt : opposition, gage, saisie.
    // Un certificat d'immatriculation perdu ou édité en duplicata n'est pas une
    // charge sur le véhicule, c'est l'histoire du titre : la démarche passe. Il
    // reste à vérifier que la carte grise déposée est bien le duplicata et non
    // l'original perdu, qui n'a plus de valeur — un coup d'œil, pas un refus.
    const BLOQUANTES = /opposition|otci|gage|saisie|suspend|vol|destruction|retrait/i;
    const arretent = mentions.filter((m) => BLOQUANTES.test(m));
    const titreRefait = mentions.some((m) => /perdu|duplicata|vol[ée]/i.test(m));

    if (arretent.length > 0) {
      ajoute("situation_non_vierge", "haute", `Le certificat n'est pas vierge : ${arretent.join(", ")}.`);
    } else if (titreRefait) {
      ajoute(
        "titre_refait",
        "moyenne",
        `Le certificat mentionne ${mentions.join(", ")} : rien n'empêche la démarche, mais vérifiez que la carte grise déposée est bien le duplicata et non l'original perdu.`,
      );
    } else if (mentions.length > 0) {
      ajoute("situation_non_vierge", "haute", `Le certificat n'est pas vierge : ${mentions.join(", ")}.`);
    } else {
      ajoute("situation_non_vierge", "haute", "Le certificat de situation administrative n'est pas vierge.");
    }
  }

  // Le guide n'exige les deux faces que pour les pièces d'identité et le permis.
  // Pour la carte grise, il demande la mention « Vendu le », la signature du
  // vendeur et la bonne date, peu importe la face où elles figurent — on ne
  // réclame donc pas un recto qu'il n'exige pas.
  const deuxFacesExigees = /identit|passeport|titre de s[ée]jour|permis/i.test(piece.libelle);
  const emplacementVerso = piece.type_document.endsWith("_verso") || /verso/i.test(piece.libelle);
  if (deuxFacesExigees && !emplacementVerso && ex.face === "verso") {
    ajoute("recto_manquant", "moyenne", "Seul le verso est visible : il manque le recto.");
  }

  return anomalies;
}

// Contrôles qui ne se voient qu'en comparant les pièces entre elles.
// Les pièces qui partagent le même fichier, groupées. Deux emplacements servis
// par un seul dépôt : c'est la même observation pour tout le monde, elle doit
// donc se calculer au même endroit.
export function doublonsParFichier(pieces: Piece[]): Piece[][] {
  const parEmpreinte = new Map<string, Piece[]>();
  for (const piece of pieces) {
    if (!piece.empreinte) continue;
    const liste = parEmpreinte.get(piece.empreinte) ?? [];
    liste.push(piece);
    parEmpreinte.set(piece.empreinte, liste);
  }
  return [...parEmpreinte.values()].filter((liste) => liste.length >= 2);
}

export function anomaliesDossier(
  pieces: Piece[],
  manquantes: string[],
  contexte: ContexteDossier,
  depotTermine: boolean,
  obligatoires: string[] = [],
): Anomalie[] {
  const anomalies: Anomalie[] = [];

  // Tant que le garage dépose ses pièces, une pièce absente est normale : elle
  // n'est signalée comme manquante qu'une fois le dépôt annoncé terminé.
  for (const libelle of manquantes) {
    anomalies.push({
      code: "piece_manquante",
      gravite: depotTermine ? "haute" : "basse",
      // L'interface affiche déjà le nom de la pièce devant le message : le
      // répéter laissait la place à la seule chose qu'on voulait savoir —
      // est-elle obligatoire, et peut-on traiter le dossier sans elle.
      message: depotTermine
        ? "Obligatoire, et absente du dossier."
        : "Obligatoire, pas encore déposée.",
      piece: libelle,
    });
  }

  // Sur une ancienne carte nationale d'identité, la date d'expiration est au
  // verso. Déposée recto seul — comme sur DEM-2026-05442 — sa validité est
  // invérifiable, et le contrôle avait pris la seule date visible, celle de
  // naissance, pour une péremption. Le guide exige « documents en cours de
  // validité » et « pièce d'identité recto/verso » : le bon constat n'est pas
  // « périmée », c'est qu'il manque une face.
  //
  // Le verso arrive souvent dans son propre emplacement, donc la question ne se
  // tranche qu'ici, où l'on voit toutes les pièces du dossier.
  const identitesRecto = pieces.filter((p) =>
    /identit|passeport|titre de s[ée]jour|permis/i.test(p.libelle)
    && !p.type_document.endsWith("_verso")
    && p.extraction?.face === "recto"
    && !p.extraction?.dates?.validite);

  for (const recto of identitesRecto) {
    const versoDepose = pieces.some((p) =>
      p !== recto
      && (p.type_document === `${recto.type_document}_verso` || p.extraction?.face === "verso")
      && /identit|passeport|titre de s[ée]jour|permis/i.test(p.libelle));
    if (versoDepose) continue;
    anomalies.push({
      code: "verso_manquant",
      gravite: "moyenne",
      message: "Seul le recto de la pièce d'identité est déposé : sur une ancienne carte, la date de validité est au verso, et rien ne permet de vérifier qu'elle est en cours.",
      piece: recto.libelle,
      document_id: recto.document_id,
    });
  }

  // Une plaque étrangère au dossier, dite une fois par pièce, remplissait la
  // liste de trois lignes identiques pour un seul fait. Et le nombre de pièces
  // qui s'accordent est justement ce qui permet de trancher : trois documents
  // contre le dossier, c'est le dossier qui a une faute de frappe ; un seul,
  // c'est souvent une lettre mal lue. On le dit donc en une phrase, qui porte
  // ce nombre.
  const plaqueDossier = contexte.immatriculation ? normalisePlaque(contexte.immatriculation) : null;
  if (plaqueDossier) {
    const parPlaque = new Map<string, Piece[]>();
    for (const piece of pieces) {
      const lues = (piece.extraction?.immatriculations ?? []).map(normalisePlaque).filter(estPlaqueFrancaise);
      if (lues.length === 0) continue;
      if (lues.some((p) => lectureCompatible(p, plaqueDossier))) continue;
      for (const lue of new Set(lues)) {
        const liste = parPlaque.get(lue) ?? [];
        liste.push(piece);
        parPlaque.set(lue, liste);
      }
    }
    for (const [lue, concernees] of parPlaque) {
      const nombre = concernees.length;
      anomalies.push({
        code: "plaque_differente",
        gravite: "haute",
        message: `Le dossier dit ${contexte.immatriculation} alors que ${nombre} document${nombre > 1 ? "s disent" : " dit"} ${formatePlaque(lue)}.`,
        piece: concernees[0].libelle,
        document_id: concernees[0].document_id,
      });
    }
  }

  // La cohérence des dates de vente entre la carte grise et la cession est
  // exigée par le guide, mais elle n'est pas contrôlable à la lecture : la
  // mention « vendu le » est manuscrite, dans une case étroite, et le modèle y
  // a lu 26/08 là où le document portait 31/08 — les deux derniers chiffres de
  // l'année pris pour un jour. Un contrôle qui se trompe une fois sur deux
  // coûte plus cher qu'un contrôle qui s'abstient : il fait rouvrir des
  // dossiers sains. Ce point figure donc dans la liste des vérifications
  // laissées à l'œil, affichée sous les signalements.

  // « Vous devez expressément être mandaté par l'ancien titulaire du véhicule
  // pour déclarer la cession, et non par un tiers » (guide SIV, page 12). Un
  // mandat signé par l'acheteur, ou par un intermédiaire, ne vaut rien pour une
  // déclaration de cession.
  if (contexte.type === "DC") {
    const mandat = pieces.find((p) => p.extraction?.type_document === "mandat");
    const cession = pieces.find((p) => p.extraction?.type_document === "certificat_cession");
    const nomDe = (p: Piece | undefined, role: string) => {
      const personne = (p?.extraction?.personnes ?? []).find((x) => x.role === role);
      if (!personne) return null;
      const complet = `${personne.prenom ?? ""} ${personne.nom ?? ""}`.trim();
      return complet || null;
    };
    const mandant = nomDe(mandat, "mandant");
    const vendeur = nomDe(cession, "vendeur");
    if (mandant && vendeur && !memePersonne(mandant, vendeur)) {
      anomalies.push({
        code: "mandant_different",
        gravite: "moyenne",
        message: `Le mandat est donné par « ${mandant} » alors que la cession désigne « ${vendeur} » comme vendeur : seul l'ancien titulaire peut mandater la déclaration de cession.`,
        piece: mandat!.libelle,
        document_id: mandat!.document_id,
      });
    }
  }

  // « Co-titulaire : double signature » (guide SIV, annexe 5). La carte grise dit
  // s'il y a deux titulaires, la cession doit alors porter deux signatures de
  // vendeur. Les deux informations sont sur deux pièces différentes, donc la
  // règle ne peut se juger qu'ici.
  //
  // Gravité moyenne et non haute : le co-titulaire est reconnu par le modèle, et
  // une carte grise mal cadrée peut lui en faire voir un qui n'existe pas. On le
  // fait regarder, on ne l'affirme pas.
  const coTitulaire = pieces.some((p) => p.extraction?.co_titulaire === true);
  if (coTitulaire) {
    const cession = pieces.find((p) =>
      p.extraction?.type_document === "certificat_cession"
      && !/\.pdf$/i.test(p.nom_fichier));
    if (cession && cession.extraction?.signatures?.second_vendeur === false) {
      anomalies.push({
        code: "double_signature_manquante",
        gravite: "moyenne",
        message: "La carte grise porte un co-titulaire : la cession doit être signée par les deux, et une seule signature est visible.",
        piece: cession.libelle,
        document_id: cession.document_id,
      });
    }
  }

  // Même fichier déposé sur deux pièces différentes. Un seul fichier pour deux
  // emplacements, c'est un seul fait : une pièce a bien été fournie, l'autre
  // manque. On le dit en une phrase et en nommant celle qui manque, plutôt que
  // de compter deux anomalies pour un seul document absent.
  for (const liste of doublonsParFichier(pieces)) {
    const lu = liste[0].extraction?.type_document ?? null;
    const fournie = lu ? liste.find((p) => appartientALaFamille(p.libelle, lu)) : undefined;
    const absentes = liste.filter((p) => p !== fournie);

    // Nommer le fichier et les emplacements : sans cela, il faut ouvrir le
    // dossier et comparer les pièces une à une pour retrouver le doublon. Les
    // deux copies portent souvent des noms différents (« fw.jpg » et
    // « FW NOUVELLE.jpg ») alors que le contenu est identique, donc on cite
    // chacune avec l'emplacement où elle a été déposée.
    // Le recto et le verso d'une même pièce dans un seul PDF de deux pages :
    // c'est la façon normale de scanner une carte grise, pas un doublon. Les
    // deux emplacements désignent la même pièce, rien ne manque.
    const socle = (libelle: string) => libelle.replace(/\s*\((recto|verso)\)\s*$/i, "").trim();
    if (liste.every((p) => socle(p.libelle) === socle(liste[0].libelle))) continue;

    const memeNom = liste.every((p) => p.nom_fichier === liste[0].nom_fichier);
    const combien = liste.length === 2 ? "deux" : String(liste.length);
    const constat = memeNom
      ? `« ${liste[0].nom_fichier} » a servi pour ${combien} pièces`
      : `${liste.map((p) => `« ${p.nom_fichier} »`).join(" et ")} sont le même document`;

    // Un emplacement nommé dit lui-même ce qu'il attendait : si le fichier
    // déposé est la pièce de l'un, les autres emplacements sont restés vides, et
    // on peut nommer précisément ce qu'il faut réclamer.
    if (fournie) {
      // Une pièce facultative non fournie n'arrête rien : on le dit sans
      // allumer le rouge, qui est réservé à ce qui bloque la démarche.
      const bloquantes = absentes.filter((p) => obligatoires.some((o) => o === p.libelle));
      anomalies.push({
        code: "fichier_duplique",
        gravite: bloquantes.length > 0 ? "haute" : "basse",
        message: bloquantes.length > 0
          ? `${constat} : il manque ${bloquantes.map((p) => libelleCourt(p.libelle)).join(", ")}.`
          : `${constat} : il manque ${absentes.map((p) => libelleCourt(p.libelle)).join(", ")} (facultatif).`,
        piece: absentes[0].libelle,
        document_id: liste[0].document_id,
      });
      continue;
    }

    // Sinon les emplacements sont anonymes — les cases « correction » où le
    // garage renvoie ses pièces après un refus. L'inventaire tranche : si
    // aucune pièce obligatoire ne manque, le dossier est complet et ce doublon
    // n'est qu'un dépôt en double, pas un défaut. Le marquer en rouge envoyait
    // relire un dossier qui n'avait rien (DEM-2026-08144).
    if (manquantes.length === 0) {
      anomalies.push({
        code: "fichier_duplique",
        gravite: "basse",
        message: `${constat} : rien ne manque.`,
        piece: liste[0].libelle,
        document_id: liste[0].document_id,
      });
      continue;
    }

    // Une pièce manque bel et bien, mais rien ne dit que ce doublon en soit la
    // cause : « pièce obligatoire absente » le signale déjà et le nomme. On se
    // contente ici de constater le double dépôt, sans le compter deux fois.
    anomalies.push({
      code: "fichier_duplique",
      gravite: "basse",
      message: `${constat}.`,
      piece: liste[0].libelle,
      document_id: liste[0].document_id,
    });
  }

  // Le recoupement des VIN entre pièces est abandonné. Sur vingt dossiers il a
  // signalé quatorze désaccords, presque tous dus à la lecture : dix-sept
  // caractères sans séparateur, où un Z devient un 2 et un O un 0. Ce qui dit de
  // façon fiable qu'une pièce concerne un autre véhicule, c'est la plaque.

  // La mention de vente est cherchée sur toutes les pièces de la carte grise, et
  // pas seulement sur celle déposée au bon endroit : le recto et le verso
  // arrivent souvent inversés, et la mention n'est alors pas là où on la
  // croirait. Elle n'est réclamée que si au moins une de ces pièces a été vue
  // comme une image — sur un PDF océrisé, l'encre est invisible.
  const cartesGrises = pieces.filter((p) => /carte grise|certificat d.immatriculation/i.test(p.libelle));
  const cartesVues = cartesGrises.filter((p) => !/\.pdf$/i.test(p.nom_fichier) && p.extraction);
  if (
    cartesVues.length > 0
    && cartesVues.some((p) => p.extraction?.mentions?.cede_le === false)
    && !cartesGrises.some((p) => p.extraction?.mentions?.cede_le === true)
  ) {
    anomalies.push({
      code: "cession_non_portee",
      gravite: "moyenne",
      message: "Aucune des faces de la carte grise ne semble porter de mention de vente datée : à confirmer à l'œil.",
      piece: cartesVues[0].libelle,
    });
  }

  // La comparaison des dates de vente est suspendue tant que leur lecture n'est
  // pas mesurée. Le guide l'exige, la règle est juste, mais elle repose sur deux
  // lectures manuscrites qui se sont trompées à chaque fois qu'on les a
  // regardées. Les dates restent extraites : il suffira de rétablir la
  // comparaison le jour où elles seront fiables.

  // Identité : on compare la pièce d'identité à la partie qu'elle est censée
  // identifier, et son libellé le dit — « pièce d'identité du vendeur » sur une
  // déclaration de cession, « du nouveau propriétaire » ailleurs. Les confondre
  // revenait à reprocher au vendeur de ne pas être l'acheteur.
  const nomComplet = (p: { nom?: string; prenom?: string }) => [p.prenom, p.nom].filter(Boolean).join(" ").trim();
  const pieceIdentite = pieces.find((p) => /identit|passeport|titre de sejour|titre de séjour/i.test(p.libelle));
  if (pieceIdentite) {
    const celleDuVendeur = /vendeur|ancien (propri[ée]taire|titulaire)|c[ée]dant/i.test(pieceIdentite.libelle);
    const roleAttendu = celleDuVendeur ? "vendeur" : "acheteur";
    const motRole = celleDuVendeur ? "le vendeur" : "l'acquéreur";

    const surLaPiece = pieceIdentite.extraction?.personnes?.map(nomComplet).find(Boolean);
    const cession = pieces.find((p) => /cession/i.test(p.libelle));
    const partie = cession?.extraction?.personnes
      ?.filter((p) => (p.role ?? "").toLowerCase() === roleAttendu)
      .map(nomComplet)
      .find(Boolean);

    // Quand la partie est une société, la pièce fournie est celle de son
    // dirigeant : le guide l'exige ainsi (« extrait Kbis + pièce d'identité du
    // dirigeant »). Comparer le nom du gérant à la raison sociale de sa société
    // ne peut que produire un faux signalement — dix-huit sur vingt le 1er
    // octobre 2026, de « Damien THORAL » contre « H2A AUTO » à six dossiers
    // contre « SASU 4 ROUES ».
    const partieEstUneSociete = cession?.extraction?.personnes
      ?.some((p) => (p.role ?? "").toLowerCase() === roleAttendu
        && (p.est_une_societe === true || estUneRaisonSociale(nomComplet(p))));

    if (surLaPiece && partie && !partieEstUneSociete && !memePersonne(surLaPiece, partie)) {
      anomalies.push({
        code: "nom_different",
        gravite: "moyenne",
        message: `La pièce d'identité est au nom de « ${surLaPiece} », mais la cession désigne « ${partie} » comme ${motRole}.`,
        piece: pieceIdentite.libelle,
      });
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
