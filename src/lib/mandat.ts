// Mandat d'immatriculation (Cerfa 13757).
//
// Le Cerfa éclate l'adresse en quatre champs distincts (n° de voie, extension,
// type de voie, nom de voie) alors qu'elle est stockée en une seule chaîne. Le
// découpage ci-dessous fait une proposition ; c'est le formulaire de
// vérification qui fait foi, le client corrige ce qui est mal coupé.

export interface MandatData {
  // Qui etait le mandant lors de la derniere generation. Permet de ne pas
  // reappliquer des valeurs saisies pour le client quand le garage bascule sur
  // lui-meme, et inversement.
  mandant_type?: "garage" | "client";
  mandant_identite: string;
  mandant_siret?: string;
  // Exigé par le Cerfa pour les personnes morales : « nom et qualité du
  // signataire », en toutes lettres et non sous forme d'image.
  signataire_nom_qualite?: string;
  adresse_numero?: string;
  adresse_extension?: string;
  adresse_type_voie?: string;
  adresse_nom_voie?: string;
  adresse_code_postal?: string;
  adresse_commune?: string;
  adresse_pays?: string;
  nature_operation?: string;
  vehicule_marque?: string;
  vehicule_vin?: string;
  vehicule_immatriculation?: string;
  lieu_declaration?: string;
  signature_path?: string;
  tampon_path?: string;
}

export interface AdresseDecoupee {
  numero: string;
  extension: string;
  type_voie: string;
  nom_voie: string;
}

// Types de voie courants. La liste sert uniquement à reconnaître le début du
// libellé ; tout ce qui n'est pas reconnu bascule dans le nom de voie, ce qui
// donne une adresse encore lisible sur le Cerfa.
const TYPES_VOIE = [
  "rue", "avenue", "boulevard", "impasse", "chemin", "route", "allee", "allée",
  "place", "quai", "cours", "square", "voie", "lotissement", "residence",
  "résidence", "hameau", "faubourg", "passage", "sentier", "traverse", "montee",
  "montée", "descente", "esplanade", "parvis", "rond-point", "villa", "cite",
  "cité", "domaine", "clos", "mail", "promenade", "zone", "za", "zi", "zac",
];

const EXTENSIONS = ["bis", "ter", "quater", "quinquies"];

// Abréviations fréquentes, ramenées à leur forme longue pour l'impression.
const ABREVIATIONS: Record<string, string> = {
  av: "avenue",
  bd: "boulevard",
  bld: "boulevard",
  che: "chemin",
  rte: "route",
  pl: "place",
  imp: "impasse",
  all: "allée",
};

export function splitAdresse(adresse: string | null | undefined): AdresseDecoupee {
  const vide: AdresseDecoupee = { numero: "", extension: "", type_voie: "", nom_voie: "" };
  if (!adresse) return vide;

  // Espaces multiples et espaces insécables ramenés à un espace simple.
  const reste = adresse.replace(/\s+/g, " ").trim();
  if (!reste) return vide;

  const mots = reste.split(" ");
  let i = 0;

  // 1. Numéro de voie, s'il ouvre l'adresse. L'extension peut être collée au
  //    numéro (« 1BIS RUE D'ETRUN », vu en base) : on la détache ici.
  let numero = "";
  let extension = "";
  const premier = mots[0].match(/^(\d+)\s*([A-Za-z]+)?$/);
  if (premier) {
    numero = premier[1];
    if (premier[2]) extension = premier[2];
    i = 1;
  }

  // 2. Extension détachée (« 1885 B ROUTE DE SAULCE », « 12 bis rue… »), qu'elle
  //    soit un mot connu ou une simple lettre. Seulement après un numéro, sinon
  //    on mangerait le premier mot d'un nom de voie.
  if (numero && !extension && i < mots.length) {
    const candidat = mots[i].toLowerCase().replace(/[.,]/g, "");
    if (EXTENSIONS.includes(candidat) || /^[a-z]$/.test(candidat)) {
      extension = candidat;
      i += 1;
    }
  }

  // 3. Type de voie, éventuellement abrégé.
  let type_voie = "";
  if (i < mots.length) {
    const candidat = mots[i].toLowerCase().replace(/[.,]/g, "");
    if (TYPES_VOIE.includes(candidat)) {
      type_voie = candidat;
      i += 1;
    } else if (ABREVIATIONS[candidat]) {
      type_voie = ABREVIATIONS[candidat];
      i += 1;
    }
  }

  // 4. Le reste est le nom de la voie. Si rien n'a été reconnu, l'adresse entière
  //    y atterrit : mieux vaut un champ trop rempli qu'une adresse tronquée.
  const nom_voie = mots.slice(i).join(" ");

  return {
    numero,
    extension: extension.toUpperCase(),
    type_voie: type_voie.toUpperCase(),
    nom_voie: (nom_voie || reste).toUpperCase(),
  };
}

// Concatène nom et qualité comme l'attend le Cerfa pour une personne morale.
export function formatSignataire(nom: string | null | undefined, qualite: string | null | undefined): string {
  const parts = [nom?.trim(), qualite?.trim()].filter(Boolean);
  return parts.join(", ");
}

// Consignes affichées quand le dossier signale un cas où le mandant n'est pas
// simplement la personne qui commande. Ces drapeaux sont déjà collectés par le
// tunnel particulier (GuestOrderInfoForm).
export interface MandantFlags {
  vehiculePro?: boolean;
  isMineur?: boolean;
  hasCotitulaire?: boolean;
  vehiculeLeasing?: boolean;
}

export function consignesMandant(flags: MandantFlags): string[] {
  const consignes: string[] = [];
  if (flags.vehiculePro) {
    consignes.push(
      "Véhicule de société : le mandant est la société. Indiquez sa raison sociale, son SIRET, et le nom et la qualité du signataire.",
    );
  }
  if (flags.isMineur) {
    consignes.push(
      "Titulaire mineur : le mandat doit être établi et signé par le représentant légal, pas par le mineur.",
    );
  }
  if (flags.hasCotitulaire) {
    consignes.push(
      "Co-titulaire déclaré : le mandat est signé par le titulaire principal.",
    );
  }
  if (flags.vehiculeLeasing) {
    consignes.push(
      "Véhicule en leasing : le propriétaire reste le loueur. Le mandat doit venir de lui — nous ne pouvons pas le pré-remplir à votre nom.",
    );
  }
  return consignes;
}

// Le leasing est le seul cas où le pré-remplissage serait trompeur : le mandant
// est une société tierce dont nous n'avons aucune donnée.
export function mandatGenerable(flags: MandantFlags): boolean {
  return !flags.vehiculeLeasing;
}

// ---------------------------------------------------------------------------
// Nature de l'opération portée sur le mandat.
//
// Le Cerfa demande de décrire « l'opération d'immatriculation », pas de reprendre
// le nom commercial de la prestation. « Carte Grise » ou « Demande de duplicata
// CG » sont des libellés de catalogue ; sur un mandat officiel on attend
// « Changement de titulaire du certificat d'immatriculation ».
//
// Les codes pro se terminent par _PRO mais désignent la même opération que leur
// équivalent particulier : le suffixe est retiré avant la recherche.
// ---------------------------------------------------------------------------
const NATURE_OPERATION: Record<string, string> = {
  CG: "Changement de titulaire du certificat d'immatriculation",
  CG_NEUF: "Première immatriculation d'un véhicule neuf",
  DA: "Déclaration d'achat d'un véhicule d'occasion",
  DC: "Déclaration de cession d'un véhicule",
  DUPLICATA: "Demande de duplicata du certificat d'immatriculation",
  DUPLICATA_CG: "Demande de duplicata du certificat d'immatriculation",
  CHGT_ADRESSE: "Changement d'adresse du titulaire",
  CHANGEMENT_ADRESSE: "Changement d'adresse du titulaire",
  CHGT_ADRESSE_LOCATAIRE: "Changement d'adresse du locataire du véhicule",
  CHANGEMENT_ADRESSE_LOCATAIRE: "Changement d'adresse du locataire du véhicule",
  COTITULAIRE: "Ajout ou retrait d'un co-titulaire",
  MODIF_CG: "Modification du certificat d'immatriculation",
  FIV: "Demande de fiche d'identification du véhicule",
  SUCCESSION: "Changement de titulaire suite à succession",
  SUCCESSION_HERITAGE: "Changement de titulaire suite à succession",
  QUITUS_FISCAL: "Demande de quitus fiscal",
  CPI_WW: "Immatriculation provisoire WW",
  WW_PROVISOIRE: "Immatriculation provisoire WW",
  ANNULER_CPI_WW: "Annulation du certificat provisoire d'immatriculation WW",
  ANNULATION_CPI_WW: "Annulation du certificat provisoire d'immatriculation WW",
  ANNULER_DC_DA: "Annulation d'une déclaration de cession ou d'achat",
  ANNULER_CORRIGER_DC_DA: "Annulation ou correction d'une déclaration de cession ou d'achat",
  IMMAT_CYCLO_ANCIEN: "Immatriculation d'un cyclomoteur ancien",
  CYCLO_ANCIEN: "Immatriculation d'un cyclomoteur ancien",
  IMMAT_DEFINITIVE: "Immatriculation définitive d'un véhicule importé",
  DEMANDE_IMMAT: "Demande d'immatriculation d'un véhicule importé",
  W_GARAGE: "Demande de certificat W garage",
};

// `fallback` sert quand un nouveau type est créé en admin sans qu'on ait pensé
// à l'ajouter ici : le titre du catalogue vaut mieux qu'un code brut.
export function natureOperation(code: string | null | undefined, fallback?: string | null): string {
  if (!code) return fallback ?? "";
  const base = code.replace(/_PRO$/, "");
  return NATURE_OPERATION[base] ?? fallback ?? code;
}
