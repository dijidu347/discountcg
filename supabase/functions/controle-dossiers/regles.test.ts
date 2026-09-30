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
  piece({ libelle: "Carte d'identité", extraction: { correspond: true, lisible: true, type_document: "carte_identite", dates: { validite: "2024-01-01" } } }),
  contexte, maintenant,
);
verifie("piece d'identite perimee", cniPerimee.some((a) => a.code === "piece_perimee"));

// Cas de DEM-2026-08168 : une carte grise n'a pas de fin de validite, le modele
// y avait range sa date d'emission.
const carteGriseDatee = anomaliesPiece(
  piece({
    type_document: "doc_3", nom_fichier: "cg.jpg",
    libelle: 'Carte grise barrée avec la mention "Vendu le", datée et signée du vendeur',
    extraction: { type_document: "carte_grise", lisible: true, immatriculations: ["AB-123-CD"], dates: { validite: "2025-02-13", emission: "2025-02-13" } },
  }),
  contexte, maintenant,
);
verifie("une carte grise ne perime pas", !carteGriseDatee.some((a) => a.code === "piece_perimee"));


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
verifie("document complet : on ne parle pas du cadrage", cgCoupeeMaisComplete.length === 0);

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
verifie("kilometrage : le SIV ne le demande pas, on n'en parle pas", !kilometrage.some((a) => a.code === "champ_vide"));







const versoSeul = anomaliesPiece(
  piece({ type_document: "doc_2", libelle: "Carte d'identité du nouveau propriétaire", extraction: { type_document: "carte_identite", face: "verso" } }),
  contexte, maintenant,
);
verifie("piece d'identite en verso seul : recto manquant", versoSeul.some((a) => a.code === "recto_manquant"));

const cgVersoSeul = anomaliesPiece(
  piece({ type_document: "doc_3", libelle: "Carte grise avec la mention cédé le recto/verso", extraction: { type_document: "carte_grise", face: "verso", immatriculations: ["AB-123-CD"] } }),
  contexte, maintenant,
);
verifie("carte grise : le guide n'exige pas les deux faces", !cgVersoSeul.some((a) => a.code === "recto_manquant"));

const emplacementVerso = anomaliesPiece(
  piece({ type_document: "doc_2_verso", libelle: "Carte d'identité (verso)", extraction: { type_document: "carte_identite", face: "verso" } }),
  contexte, maintenant,
);
verifie("emplacement prevu pour le verso : normal", !emplacementVerso.some((a) => a.code === "recto_manquant"));


// Cas de DEM-2026-07688 : rapport Histovec signalant une immatriculation
// suspendue et un certificat perdu, et plaque partiellement masquee.
const nonGageCharge = anomaliesPiece(
  piece({
    type_document: "non_gage",
    libelle: "Certificat de situation administrative (non-gage)",
    extraction: {
      type_document: "certificat_non_gage", lisible: true,
      immatriculations: ["AS4QZ"],
      situation_administrative: { vierge: false, mentions: ["immatriculation suspendue", "certificat perdu"] },
      dates: { emission: "2026-09-29" },
    },
  }),
  { ...contexte, immatriculation: "AS-475-QZ" }, maintenant,
);
verifie("non-gage non vierge : bloquant", nonGageCharge.some((a) => a.code === "situation_non_vierge" && a.gravite === "haute"));
verifie("plaque partiellement lue : pas un autre vehicule", !nonGageCharge.some((a) => a.code === "plaque_differente"));

const nonGageVierge = anomaliesPiece(
  piece({
    type_document: "non_gage",
    libelle: "Certificat de situation administrative (non-gage)",
    extraction: {
      type_document: "certificat_non_gage", lisible: true,
      immatriculations: ["AB-123-CD"],
      situation_administrative: { vierge: true, mentions: [] },
      dates: { emission: "2026-09-29" },
    },
  }),
  contexte, maintenant,
);
verifie("non-gage vierge : rien a signaler", nonGageVierge.length === 0);

const autrePlaque = anomaliesPiece(
  piece({ extraction: { lisible: true, type_document: "certificat_cession", immatriculations: ["EF-456-GH"] } }),
  contexte, maintenant,
);
verifie("plaque vraiment differente : toujours signalee", autrePlaque.some((a) => a.code === "plaque_differente"));


// Cas de DEM-2026-08088 : mandat genere en PDF, signe et tamponne, que le
// modele annoncait non signe faute de voir l'encre.
const mandatPdf = anomaliesPiece(
  piece({
    nom_fichier: "Mandat_13757.pdf",
    libelle: "Mandat signé et tamponné (cerfa 13757*03)",
    extraction: { type_document: "mandat", lisible: true, immatriculations: ["AB-123-CD"], signatures: { mandant: false, tampon: false } },
  }),
  contexte, maintenant,
);
verifie("PDF : on ne juge pas une signature qu'on ne voit pas", !mandatPdf.some((a) => a.code === "mandat_non_signe"));

const mandatPhoto = anomaliesPiece(
  piece({
    nom_fichier: "mandat.jpg",
    libelle: "Mandat signé et tamponné (cerfa 13757*03)",
    extraction: { type_document: "mandat", lisible: true, immatriculations: ["AB-123-CD"], signatures: { mandant: false, tampon: false } },
  }),
  contexte, maintenant,
);
verifie("photo : la signature absente reste signalee", mandatPhoto.some((a) => a.code === "mandat_non_signe"));

// Cas de DEM-2026-07688 : le numero de formule range parmi les plaques.
const fausseplaque = anomaliesPiece(
  piece({ extraction: { lisible: true, type_document: "declaration_achat", immatriculations: ["BS47502", "2022AV45464"] } }),
  { ...contexte, immatriculation: "AS-475-QZ" }, maintenant,
);
verifie("suites de caracteres qui ne sont pas des plaques : ignorees", !fausseplaque.some((a) => a.code === "plaque_differente"));


// Cas de DEM-2026-08168 : carte grise en PDF annoncee sans mention de vente,
// alors que l'encre est invisible pour un texte ocerise.



const signaturePdf = anomaliesPiece(
  piece({
    nom_fichier: "cession.pdf",
    libelle: "Certificat de cession signé (cerfa 15776*02)",
    extraction: { type_document: "certificat_cession", lisible: true, immatriculations: ["AB-123-CD"], champs_incomplets: ["signature vendeur", "signature acheteur", "kilométrage"] },
  }),
  contexte, maintenant,
);
verifie("PDF : on ne parle pas des signatures", !signaturePdf.some((a) => (a.message ?? "").toLowerCase().includes("signature")));
verifie("PDF : le kilometrage ne ressort pas non plus", !signaturePdf.some((a) => (a.message ?? "").includes("kilométrage")));


// La mention de vente est cherchee sur toutes les faces : le recto et le verso
// arrivent souvent inverses (vu sur DEM-2026-07905).
const faceSansMention = piece({
  document_id: "a", nom_fichier: "cg1.jpg", type_document: "doc_3",
  libelle: "Carte grise barrée avec la mention Vendu le — recto/verso",
  extraction: { type_document: "carte_grise", mentions: { cede_le: false, barree: false } },
});
const faceAvecMention = piece({
  document_id: "b", nom_fichier: "cg2.jpg", type_document: "doc_3_verso",
  libelle: "Carte grise barrée avec la mention Vendu le — recto/verso (verso)",
  extraction: { type_document: "carte_grise", mentions: { cede_le: true, barree: true } },
});
verifie(
  "mention portee sur l'autre face : rien a signaler",
  !anomaliesDossier([faceSansMention, faceAvecMention], [], contexte, true).some((a) => a.code === "cession_non_portee"),
);
verifie(
  "aucune face ne porte la mention : signale",
  anomaliesDossier([faceSansMention], [], contexte, true).some((a) => a.code === "cession_non_portee" && a.gravite === "moyenne"),
);
verifie(
  "carte grise en PDF : on ne reproche pas une encre invisible",
  !anomaliesDossier([piece({
    document_id: "c", nom_fichier: "cg.pdf", type_document: "doc_3",
    libelle: "Carte grise barrée avec la mention Vendu le — recto/verso",
    extraction: { type_document: "carte_grise", mentions: { cede_le: false } },
  })], [], contexte, true).some((a) => a.code === "cession_non_portee"),
);

console.log(echecs === 0 ? "\nTOUT PASSE" : `\n${echecs} ECHEC(S)`);
