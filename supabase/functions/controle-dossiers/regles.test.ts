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

const nomsDifferents = anomaliesDossier([
  piece({ document_id: "a", libelle: "Carte d'identité", extraction: { personnes: [{ role: "titulaire", nom: "DUPONT", prenom: "Jean" }] } }),
  piece({ document_id: "b", libelle: "Mandat (cerfa 13757*03)", extraction: { personnes: [{ role: "mandant", nom: "LEROY", prenom: "Marc" }] } }),
], [], contexte, true);
verifie("noms differents entre pieces", nomsDifferents.some((a) => a.code === "nom_different"));

console.log(echecs === 0 ? "\nTOUT PASSE" : `\n${echecs} ECHEC(S)`);
