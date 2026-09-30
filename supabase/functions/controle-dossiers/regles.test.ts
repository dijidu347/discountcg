// Vérification des règles de contrôle, sans base ni réseau.
// Lancement : npx sucrase-node supabase/functions/controle-dossiers/regles.test.ts

import { anomaliesPiece, anomaliesDossier, memePersonne, memeAdresse, niveauDossier, type Piece, type ContexteDossier } from "./regles.ts";

let echecs = 0;
const verifie = (nom: string, condition: boolean) => {
  if (!condition) { echecs++; console.log("ECHEC :", nom); } else console.log("ok   :", nom);
};

verifie("meme personne malgre un prenom en plus", memePersonne("Jean DUPONT", "Jean Pierre DUPONT"));
verifie("meme personne avec accents", memePersonne("Stéphane MÜLLER", "STEPHANE MULLER"));
verifie("personnes differentes", !memePersonne("Jean DUPONT", "Marc LEROY"));
verifie("particule ignoree", memePersonne("Jean DE LA FONTAINE", "FONTAINE Jean"));
verifie("meme adresse abregee", memeAdresse("12 rue de l'Avenir, 30600 Vestric", "12 r. de l Avenir 30600 VESTRIC ET CANDIAC"));
verifie("code postal different", !memeAdresse("12 rue A, 30600 X", "12 rue A, 34000 Y"));
verifie("numero different", !memeAdresse("12 rue A, 30600 X", "14 rue A, 30600 X"));

const contexte: ContexteDossier = { type: "CG", immatriculation: "AB-123-CD", vin: "VF1RFB00X12345678" };
const maintenant = new Date("2026-09-29T10:00:00Z");

const piece = (extra: Partial<Piece>): Piece => ({
  document_id: "d1", type_document: "doc_3", libelle: "Certificat de cession (cerfa 15776*01)",
  nom_fichier: "cession.jpg", taille_octets: 400000, ...extra,
});

const heic = anomaliesPiece(piece({ nom_fichier: "IMG_4412.HEIC" }), contexte, maintenant);
verifie("HEIC signale", heic.some((a) => a.code === "format_illisible" && a.gravite === "haute"));

const mauvaisePlaque = anomaliesPiece(
  piece({ extraction: { correspond: true, lisible: true, immatriculations: ["EF 456 GH"] } }),
  contexte, maintenant,
);
verifie("plaque differente signalee", mauvaisePlaque.some((a) => a.code === "plaque_differente"));

const bonnePlaque = anomaliesPiece(
  piece({ extraction: { correspond: true, lisible: true, immatriculations: ["ab123cd"] } }),
  contexte, maintenant,
);
verifie("plaque identique non signalee", bonnePlaque.length === 0);

const nonSignee = anomaliesPiece(
  piece({ extraction: { correspond: true, lisible: true, signatures: { vendeur: false, acheteur: true } } }),
  contexte, maintenant,
);
verifie("cession non signee", nonSignee.some((a) => a.code === "signature_manquante"));

const nonGage = anomaliesPiece(
  piece({ libelle: "Certificat de situation administrative (non-gage)", extraction: { correspond: true, lisible: true, dates: { emission: "2026-08-01" } } }),
  contexte, maintenant,
);
verifie("non-gage trop ancien", nonGage.some((a) => a.code === "piece_trop_ancienne"));

const cniPerimee = anomaliesPiece(
  piece({ libelle: "Carte d'identité", extraction: { correspond: true, lisible: true, dates: { validite: "2024-01-01" } } }),
  contexte, maintenant,
);
verifie("piece perimee", cniPerimee.some((a) => a.code === "piece_perimee"));

const doublon = anomaliesDossier(
  [piece({ document_id: "a", empreinte: "xyz", libelle: "Carte d'identité" }), piece({ document_id: "b", empreinte: "xyz", libelle: "Permis de conduire" })],
  [], contexte, true,
);
verifie("fichier duplique", doublon.some((a) => a.code === "fichier_duplique"));

const manquantes = anomaliesDossier([], ["Mandat (cerfa 13757*03)"], contexte, false);
verifie("depot en cours = information", manquantes[0].gravite === "basse");
verifie("niveau vert si rien de grave", niveauDossier(manquantes) === "vert");

const manquantesFin = anomaliesDossier([], ["Mandat (cerfa 13757*03)"], contexte, true);
verifie("depot termine = anomalie haute", manquantesFin[0].gravite === "haute");




const pieceLibre = anomaliesPiece(
  piece({ type_document: "autre_piece_1", libelle: "Ci", extraction: { correspond: false, lisible: true } }),
  contexte, maintenant,
);
verifie("piece ajoutee librement : pas de reproche de correspondance", !pieceLibre.some((a) => a.code === "mauvaise_piece"));

const mauvaisePiece = anomaliesPiece(
  piece({ type_document: "doc_2", libelle: "Carte d'identité", extraction: { correspond: false, lisible: true, type_document: "carte_grise" } }),
  contexte, maintenant,
);
verifie("piece imposee : mauvaise piece signalee", mauvaisePiece.some((a) => a.code === "mauvaise_piece"));

const mandatNonSigne = anomaliesPiece(
  piece({ libelle: "Mandat (cerfa 13757*03)", extraction: { correspond: true, lisible: true, signatures: { mandant: false, tampon: false } } }),
  contexte, maintenant,
);
verifie("mandat non signe (champ mandant)", mandatNonSigne.some((a) => a.code === "mandat_non_signe"));

const mandatSigne = anomaliesPiece(
  piece({ libelle: "Mandat (cerfa 13757*03)", extraction: { correspond: true, lisible: true, type_document: "mandat", immatriculations: ["AB-123-CD"], signatures: { mandant: true, tampon: false } } }),
  contexte, maintenant,
);
verifie("mandat signe : rien a signaler", mandatSigne.length === 0);

const mandatSansVin = anomaliesPiece(
  piece({ libelle: "Mandat (cerfa 13757*03)", extraction: { type_document: "mandat", immatriculations: ["AB-123-CD"], champs_incomplets: ["Numéro VIN"] } }),
  contexte, maintenant,
);
verifie("VIN absent mais plaque presente : pas de reproche", !mandatSansVin.some((a) => a.code === "champ_vide"));

const mandatSansRien = anomaliesPiece(
  piece({ libelle: "Mandat (cerfa 13757*03)", extraction: { type_document: "mandat", immatriculations: [] } }),
  contexte, maintenant,
);
verifie("mandat sans plaque ni VIN : vehicule non identifie", mandatSansRien.some((a) => a.code === "vehicule_non_identifie"));

const venteEncheres = anomaliesPiece(
  piece({ libelle: "Certificat de cession (cerfa 15776*01)", extraction: { correspond: false, lisible: true, type_document: "certificat_vente_publique" } }),
  contexte, maintenant,
);
verifie("vente aux encheres vaut cession", !venteEncheres.some((a) => a.code === "mauvaise_piece"));

const passeport = anomaliesPiece(
  piece({ libelle: "Carte d'identité du nouveau propriétaire", extraction: { correspond: false, lisible: true, type_document: "passeport" } }),
  contexte, maintenant,
);
verifie("passeport vaut piece d'identite", !passeport.some((a) => a.code === "mauvaise_piece"));

const cgAuLieuDeJustif = anomaliesPiece(
  piece({ libelle: "Justificatif de domicile", extraction: { correspond: true, lisible: true, type_document: "carte_grise" } }),
  contexte, maintenant,
);
verifie("carte grise a la place du justificatif : mauvaise piece", cgAuLieuDeJustif.some((a) => a.code === "mauvaise_piece"));

const cgNonBarree = anomaliesPiece(
  piece({ type_document: "doc_3", libelle: "Carte grise barrée signé avec la mention \"cédé le....\" recto/verso", extraction: { type_document: "carte_grise", mentions: { cede_le: false, barree: false } } }),
  contexte, maintenant,
);
verifie("carte grise sans mention cede le : signalee, jamais bloquante", cgNonBarree.some((a) => a.code === "cession_non_portee") && cgNonBarree.every((a) => a.gravite !== "haute"));

const versoCg = anomaliesPiece(
  piece({ type_document: "doc_3_verso", libelle: "Carte grise barrée (verso)", extraction: { type_document: "carte_grise", mentions: { cede_le: false } } }),
  contexte, maintenant,
);
verifie("verso : on n'y cherche pas la mention", !versoCg.some((a) => a.code === "cession_non_portee"));


import { vinsDifferents } from "./regles.ts";
verifie("VIN mal lu : signale mais jamais bloquant", anomaliesDossier([
  piece({ document_id: "a", libelle: "Certificat de cession (cerfa 15776*01)", extraction: { vin: "VF3MC9HZJSJS50210" } }),
  piece({ document_id: "b", libelle: "Mandat (cerfa 13757*03)", extraction: { vin: "VF3MCBHZWJS050200" } }),
], [], contexte, true).every((a) => a.gravite !== "haute"));
verifie("VIN vraiment different", vinsDifferents("VF1RFB00X12345678", "WVWZZZ1KZAW123456"));

const vinsProches = anomaliesDossier([
  piece({ document_id: "a", libelle: "Certificat de cession (cerfa 15776*01)", extraction: { vin: "VF7NX9HR8CY534320" } }),
  piece({ document_id: "b", libelle: "Carte grise barrée", extraction: { vin: "VF7NX9HR8CL534201" } }),
], [], contexte, true);
verifie("deux lectures du meme VIN : rien a signaler", !vinsProches.some((a) => a.code === "vin_incoherent"));

const mandantPro = anomaliesDossier([
  piece({ document_id: "a", libelle: "Mandat (cerfa 13757*03)", extraction: { personnes: [{ role: "mandant", nom: "EMPIRE AUTO" }] } }),
  piece({ document_id: "b", libelle: "Carte grise avec la mention cédé le", extraction: { personnes: [{ role: "titulaire", nom: "BIBI", prenom: "Hassene" }] } }),
], [], contexte, true);
verifie("garage mandant vs vendeur particulier : normal", !mandantPro.some((a) => a.code === "nom_different"));

const identiteFausse = anomaliesDossier([
  piece({ document_id: "a", libelle: "Carte d'identité du nouveau propriétaire", extraction: { personnes: [{ role: "titulaire", nom: "DUPONT", prenom: "Jean" }] } }),
  piece({ document_id: "b", libelle: "Certificat de cession (cerfa 15776*01)", extraction: { personnes: [{ role: "acheteur", nom: "LEROY", prenom: "Marc" }] } }),
], [], contexte, true);
verifie("identite qui ne correspond pas a l'acheteur", identiteFausse.some((a) => a.code === "nom_different"));




// Le cas de DEM-2026-08200 : carte grise signalee coupee, alors que la plaque,
// le VIN et la mention « cede le » y etaient tous lisibles.
const cgCoupeeMaisComplete = anomaliesPiece(
  piece({
    type_document: "doc_3",
    libelle: "Carte grise avec la mention \"cédé le....\" recto/verso",
    extraction: {
      correspond: true, lisible: true, type_document: "carte_grise",
      defauts: ["tronque", "reflet"],
      immatriculations: ["AB-123-CD"], vin: "VF1RFB00X12345678",
      mentions: { cede_le: true, barree: true },
    },
  }),
  contexte, maintenant,
);
verifie("document coupe mais complet : information seulement", cgCoupeeMaisComplete.every((a) => a.gravite === "basse"));

const cgCoupeeEtVide = anomaliesPiece(
  piece({ extraction: { correspond: true, lisible: true, type_document: "carte_grise", defauts: ["tronque"] } }),
  contexte, maintenant,
);
verifie("document coupe et illisible : a verifier", cgCoupeeEtVide.some((a) => a.code === "qualite_tronque" && a.gravite === "moyenne"));

const fichierVide = anomaliesPiece(piece({ taille_octets: 4000 }), contexte, maintenant);
verifie("fichier minuscule : bloquant", fichierVide.some((a) => a.code === "fichier_trop_leger" && a.gravite === "haute"));

const heureManquante = anomaliesPiece(
  piece({ extraction: { correspond: true, lisible: true, type_document: "certificat_cession", champs_incomplets: ["heure de cession"] } }),
  contexte, maintenant,
);
verifie("heure de cession : case obligatoire du SIV, donc a verifier", heureManquante.some((a) => a.code === "champ_vide" && a.gravite === "moyenne"));

const kilometrage = anomaliesPiece(
  piece({ extraction: { correspond: true, lisible: true, type_document: "certificat_cession", immatriculations: ["AB-123-CD"], champs_incomplets: ["kilométrage"] } }),
  contexte, maintenant,
);
verifie("kilometrage : le SIV ne le demande pas, information", kilometrage.every((a) => a.gravite === "basse"));

const datesDiscordantes = anomaliesDossier([
  piece({ document_id: "a", libelle: "Certificat de cession (cerfa 15776*01)", extraction: { dates: { cession: "2026-09-16" } } }),
  piece({ document_id: "b", libelle: "Carte grise barrée", extraction: { dates: { cession: "2026-09-18" } } }),
], [], contexte, true);
verifie("dates de cession discordantes entre carte grise et cession", datesDiscordantes.some((a) => a.code === "dates_cession_differentes" && a.gravite === "haute"));

const memesDates = anomaliesDossier([
  piece({ document_id: "a", libelle: "Certificat de cession (cerfa 15776*01)", extraction: { dates: { cession: "2026-09-16" } } }),
  piece({ document_id: "b", libelle: "Carte grise barrée", extraction: { dates: { cession: "2026-09-16" } } }),
], [], contexte, true);
verifie("memes dates : rien a signaler", !memesDates.some((a) => a.code === "dates_cession_differentes"));


const cerfaPerime = anomaliesPiece(
  piece({ libelle: "Certificat déclaration d'achat (cerfa 13751*02)", extraction: { type_document: "declaration_achat", version_cerfa: "13751*01" } }),
  contexte, maintenant,
);
verifie("cerfa dans une version perimee", cerfaPerime.some((a) => a.code === "cerfa_perime"));

const cerfaRecent = anomaliesPiece(
  piece({ libelle: "Certificat de cession (cerfa 15776*01)", extraction: { type_document: "certificat_cession", version_cerfa: "15776*02" } }),
  contexte, maintenant,
);
verifie("version plus recente que demandee : rien a dire", !cerfaRecent.some((a) => a.code === "cerfa_perime"));

const autreCerfa = anomaliesPiece(
  piece({ libelle: "Mandat (cerfa 13757*03)", extraction: { type_document: "mandat", immatriculations: ["AB-123-CD"], version_cerfa: "13750*05" } }),
  contexte, maintenant,
);
verifie("deux formulaires differents : pas de comparaison", !autreCerfa.some((a) => a.code === "cerfa_perime"));

const versoSeul = anomaliesPiece(
  piece({ type_document: "doc_2", libelle: "Carte d'identité du nouveau propriétaire", extraction: { type_document: "carte_identite", face: "verso" } }),
  contexte, maintenant,
);
verifie("verso seul : recto manquant", versoSeul.some((a) => a.code === "recto_manquant"));

const emplacementVerso = anomaliesPiece(
  piece({ type_document: "doc_2_verso", libelle: "Carte d'identité (verso)", extraction: { type_document: "carte_identite", face: "verso" } }),
  contexte, maintenant,
);
verifie("emplacement prevu pour le verso : normal", !emplacementVerso.some((a) => a.code === "recto_manquant"));

console.log(echecs === 0 ? "\nTOUT PASSE" : `\n${echecs} ECHEC(S)`);
