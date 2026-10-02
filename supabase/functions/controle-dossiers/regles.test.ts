// Vérification des règles de contrôle, sans base ni réseau.
// Lancement : npx sucrase-node supabase/functions/controle-dossiers/regles.test.ts

import { anomaliesPiece, anomaliesDossier, appartientALaFamille as _af, champObligatoireSiv, doublonsParFichier, horsSujet, memePersonne, memeAdresse, niveauDossier, type Piece, type ContexteDossier } from "./regles.ts";

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
  piece({ extraction: { correspond: true, lisible: true, immatriculations: ["ab123cd"], dates: { cession: "2026-09-01" } } }),
  contexte, maintenant,
);
verifie("plaque identique non signalee", bonnePlaque.length === 0);

const nonSignee = anomaliesPiece(
  piece({ extraction: { correspond: true, lisible: true, signatures: { vendeur: false, acheteur: true } } }),
  contexte, maintenant,
);
// Les signatures sont passees dans l'encadre « A verifier vous-meme » : sur
// DEM-2026-07941 le modele annoncait une cession non signee par l'acheteur
// alors qu'elle l'etait. Il devine l'encre plus qu'il ne la lit.
verifie("une signature n'est plus jugee automatiquement",
  !nonSignee.some((a) => a.code === "signature_manquante"));

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
verifie("ni celle du mandat", !mandatNonSigne.some((a) => a.code === "mandat_non_signe"));

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
  piece({ document_id: "b", libelle: "Certificat de cession (cerfa 15776*02)", extraction: { personnes: [{ role: "acheteur", nom: "LEROY", prenom: "Marc" }] } }),
], [], contexte, true);
verifie("identite de l'acquereur qui ne correspond pas", identiteFausse.some((a) => a.code === "nom_different"));

// Sur une declaration de cession, la piece d'identite est celle du VENDEUR :
// la comparer a l'acquereur revenait a reprocher a l'un de ne pas etre l'autre.
const identiteDuVendeur = anomaliesDossier([
  piece({ document_id: "a", libelle: "Pièce d'identité du vendeur (recto/verso)", extraction: { personnes: [{ role: "titulaire", nom: "CHAIX", prenom: "Damien" }] } }),
  piece({ document_id: "b", libelle: "Certificat de cession signé (cerfa 15776*02)", extraction: { personnes: [{ role: "vendeur", nom: "CHAIX", prenom: "Damien" }, { role: "acheteur", nom: "DUMAS", prenom: "Cédric" }] } }),
], [], contexte, true);
verifie("piece du vendeur comparee au vendeur : rien a signaler", !identiteDuVendeur.some((a) => a.code === "nom_different"));

const vendeurQuiNeColle = anomaliesDossier([
  piece({ document_id: "a", libelle: "Pièce d'identité du vendeur (recto/verso)", extraction: { personnes: [{ role: "titulaire", nom: "MARTIN", prenom: "Paul" }] } }),
  piece({ document_id: "b", libelle: "Certificat de cession signé (cerfa 15776*02)", extraction: { personnes: [{ role: "vendeur", nom: "CHAIX", prenom: "Damien" }] } }),
], [], contexte, true);
verifie("piece du vendeur qui ne correspond pas au vendeur : signalee", vendeurQuiNeColle.some((a) => a.code === "nom_different"));




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
verifie("document coupe et illisible : a verifier",
  cgCoupeeEtVide.some((a) => a.code === "qualite" && a.gravite === "moyenne" && a.message.includes("coupée")));

const fichierVide = anomaliesPiece(piece({ taille_octets: 4000 }), contexte, maintenant);
verifie("fichier minuscule : bloquant", fichierVide.some((a) => a.code === "fichier_trop_leger" && a.gravite === "haute"));

const heureManquante = anomaliesPiece(
  piece({ extraction: { correspond: true, lisible: true, type_document: "certificat_cession", champs_incomplets: ["heure de cession"] } }),
  contexte, maintenant,
);
// L'heure de cession est bien une case du SIV, mais elle est passee dans
// l'encadre « A verifier vous-meme » : ecrite a la main dans une case minuscule,
// le modele la declarait vide vingt-huit fois sur quarante-cinq signalements de
// champ, et l'administration ne l'a jamais reprochee du temps du controle
// manuel. Elle reste exigee du dossier, elle n'est plus reprochee au garage.
verifie("heure de cession : laissee a l'oeil, plus signalee comme champ vide",
  !heureManquante.some((a) => a.code === "champ_vide"));

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
verifie("meme vue sur une photo, la signature reste a l'oeil",
  !mandatPhoto.some((a) => a.code === "mandat_non_signe"));

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





const daSansDate = anomaliesPiece(
  piece({
    nom_fichier: "da.jpg",
    libelle: "Déclaration d'achat signée et tamponnée (cerfa 13751*02)",
    extraction: { type_document: "declaration_achat", lisible: true, immatriculations: ["AB-123-CD"], dates: { emission: "2026-09-02" } },
  }),
  contexte, maintenant,
);
verifie("date de vente absente sur une DA : signalee", daSansDate.some((a) => a.code === "date_vente_absente"));

const daAvecDate = anomaliesPiece(
  piece({
    nom_fichier: "da.jpg",
    libelle: "Déclaration d'achat signée et tamponnée (cerfa 13751*02)",
    extraction: { type_document: "declaration_achat", lisible: true, immatriculations: ["AB-123-CD"], dates: { cession: "2026-08-31" } },
  }),
  contexte, maintenant,
);
verifie("date de vente presente : rien a signaler", !daAvecDate.some((a) => a.code === "date_vente_absente"));


// Cas de DEM-2026-08141 : toutes les pieces refusees, renvoyees dans des cases
// « correction » indifferenciees.
import { appartientALaFamille } from "./regles.ts";
verifie("une correction reconnue comme cession comble l'emplacement cession",
  appartientALaFamille("Certificat de cession signé et tamponné (cerfa 15776*02)", "certificat_cession"));
verifie("une declaration d'achat ne comble pas l'emplacement de la carte grise",
  !appartientALaFamille('Carte grise barrée avec la mention "Vendu le"', "declaration_achat"));
verifie("un accuse d'enregistrement comble l'emplacement du recepisse",
  appartientALaFamille("Récépissé de déclaration d'achat du vendeur professionnel", "accuse_enregistrement_achat"));

// Cas de DEM-2026-08088 et DEM-2026-08215 : un seul fichier depose sur deux
// emplacements. C'est un seul fait — une piece fournie, une piece absente — et
// il doit se lire en une phrase qui nomme celle qui manque.
const memeFichier: Piece[] = [
  piece({
    document_id: "dup1", type_document: "doc_1", empreinte: "abc",
    libelle: "Déclaration d'achat signée et tamponnée (cerfa 13751*02)",
    extraction: { type_document: "declaration_achat", lisible: true },
  }),
  piece({
    document_id: "dup2", type_document: "doc_2", empreinte: "abc",
    libelle: "Certificat de cession signé et tamponné (cerfa 15776*02)",
    extraction: { type_document: "declaration_achat", lisible: true },
  }),
];
const obligatoiresDA = [
  "Déclaration d'achat signée et tamponnée (cerfa 13751*02)",
  "Certificat de cession signé et tamponné (cerfa 15776*02)",
];
const surDossier = anomaliesDossier(memeFichier, [], contexte, true, obligatoiresDA);
const doublonTrouve = surDossier.find((a) => a.code === "fichier_duplique");
verifie("le doublon nomme la piece qui manque, en abrege",
  !!doublonTrouve && doublonTrouve.message.includes("il manque la DC"));
verifie("et il nomme le fichier en cause",
  !!doublonTrouve && doublonTrouve.message.includes("cession.jpg"));
verifie("le doublon n'accuse pas la piece qui a bien ete fournie",
  !!doublonTrouve && !doublonTrouve.message.includes("il manque la DA"));

const doublonsDeDocuments = new Set(doublonsParFichier(memeFichier).flat().map((p) => p.document_id));
const piecesDuDoublon = memeFichier.flatMap((p) =>
  anomaliesPiece(p, contexte, maintenant, doublonsDeDocuments.has(p.document_id)));
verifie("un seul signalement pour un seul document absent",
  !piecesDuDoublon.some((a) => a.code === "mauvaise_piece"));

// Hors doublon, « ce n'est pas la bonne piece » reste signale.
const horsDoublon = anomaliesPiece(
  piece({
    libelle: "Certificat de cession signé et tamponné (cerfa 15776*02)",
    extraction: { type_document: "declaration_achat", lisible: true },
  }),
  contexte, maintenant,
);
verifie("hors doublon, la mauvaise piece est toujours signalee",
  horsDoublon.some((a) => a.code === "mauvaise_piece"));

// Cas de DEM-2026-08144 : le non-gage refuse a ete redepose deux fois dans des
// cases « correction » anonymes. L'inventaire est complet, donc rien ne manque
// et le dossier ne doit pas virer au rouge pour une maladresse.
const redepotEnDouble: Piece[] = [
  piece({
    document_id: "c1", type_document: "correction_1", empreinte: "zz", libelle: "correction_1",
    extraction: { type_document: "certificat_non_gage", lisible: true },
  }),
  piece({
    document_id: "c2", type_document: "correction_2", empreinte: "zz", libelle: "correction_2",
    extraction: { type_document: "certificat_non_gage", lisible: true },
  }),
];
const dossierComplet = anomaliesDossier(redepotEnDouble, [], contexte, true, obligatoiresDA);
verifie("un redepot en double sans piece manquante ne vire pas au rouge",
  niveauDossier(dossierComplet) !== "rouge");
verifie("et il le dit : rien ne manque",
  dossierComplet.some((a) => a.code === "fichier_duplique" && a.message.includes("rien ne manque")));

const dossierIncomplet = anomaliesDossier(redepotEnDouble, ["Mandat signé"], contexte, true, obligatoiresDA);
verifie("une piece reellement absente reste signalee a part",
  dossierIncomplet.some((a) => a.code === "piece_manquante" && a.piece === "le mandat"));
verifie("le doublon anonyme n'accuse personne a sa place",
  !dossierIncomplet.some((a) => a.code === "fichier_duplique" && a.message.includes("il manque")));

// Cas de DEM-2026-02459 : un PDF de deux pages depose pour le recto et le verso
// de la carte grise. C'est la facon normale de scanner une carte grise.
const rectoVerso: Piece[] = [
  piece({
    document_id: "rv1", type_document: "doc_3", empreinte: "cg", nom_fichier: "Carte grise Clio.pdf",
    libelle: 'Carte grise barrée avec la mention "Vendu le" — recto/verso',
    extraction: { type_document: "carte_grise", lisible: true },
  }),
  piece({
    document_id: "rv2", type_document: "doc_3_verso", empreinte: "cg", nom_fichier: "Carte grise Clio.pdf",
    libelle: 'Carte grise barrée avec la mention "Vendu le" — recto/verso (verso)',
    extraction: { type_document: "carte_grise", lisible: true },
  }),
];
verifie("un PDF recto-verso n'est pas un doublon",
  !anomaliesDossier(rectoVerso, [], contexte, true, []).some((a) => a.code === "fichier_duplique"));

// Cas de DEM-2026-00674 : la piece absente est facultative, rien ne bloque.
const versPieceFacultative: Piece[] = [
  piece({
    document_id: "f1", type_document: "doc_2", empreinte: "ff", nom_fichier: "IMG_3461.jpeg",
    libelle: "Déclaration d'achat signée et tamponnée (cerfa 13751*02)",
    extraction: { type_document: "declaration_achat", lisible: true },
  }),
  piece({
    document_id: "f2", type_document: "doc_4", empreinte: "ff", nom_fichier: "IMG_3461.jpeg",
    libelle: "Récépissé de déclaration d'achat du vendeur professionnel",
    extraction: { type_document: "declaration_achat", lisible: true },
  }),
];
const avecFacultative = anomaliesDossier(versPieceFacultative, [], contexte, true, obligatoiresDA);
verifie("une piece facultative absente ne vire pas au rouge",
  niveauDossier(avecFacultative) !== "rouge");
verifie("et le message dit qu'elle est facultative",
  avecFacultative.some((a) => a.code === "fichier_duplique" && a.message.includes("facultatif")));

// Le guide exige l'identite du VIN entre la carte grise et la cession, mais la
// lecture de dix-sept caracteres sans separateur se trompe d'un caractere ou
// deux. On distingue la coquille de l'autre vehicule.
const vinCoquille = anomaliesPiece(
  piece({ extraction: { type_document: "certificat_cession", lisible: true, vin: "VF1RFB0OX12345G78" } }),
  contexte, maintenant,
);
verifie("une coquille de lecture sur le VIN ne declenche rien",
  !vinCoquille.some((a) => a.code === "vin_different"));

const vinAutreVehicule = anomaliesPiece(
  piece({ extraction: { type_document: "certificat_cession", lisible: true, vin: "WVWZZZ1KZAW123456" } }),
  contexte, maintenant,
);
verifie("un VIN franchement different est signale",
  vinAutreVehicule.some((a) => a.code === "vin_different" && a.gravite === "haute"));

const vinTronque = anomaliesPiece(
  piece({ extraction: { type_document: "certificat_cession", lisible: true, vin: "VF1RFB00X" } }),
  contexte, maintenant,
);
verifie("un VIN tronque n'est pas compare",
  !vinTronque.some((a) => a.code === "vin_different"));

// « Verifier la coherence du Siret » (guide SIV, annexe 5).
const contexteSociete: ContexteDossier = {
  ...contexte, mandat_data: { mandant_siret: "123 456 789 00012" },
};
const mandat = (siret: string | null) => piece({
  type_document: "doc_5", libelle: "Mandat signé et tamponné (cerfa 13757*03)", nom_fichier: "mandat.jpg",
  extraction: { type_document: "mandat", lisible: true, siret_mandant: siret },
});
verifie("un Siret etranger au mandant est signale",
  anomaliesPiece(mandat("98765432100019"), contexteSociete, maintenant)
    .some((a) => a.code === "siret_different" && a.gravite === "haute"));
verifie("le meme Siren depuis un autre etablissement passe",
  !anomaliesPiece(mandat("12345678900038"), contexteSociete, maintenant)
    .some((a) => a.code === "siret_different"));
verifie("un Siren a neuf chiffres se compare au Siret",
  !anomaliesPiece(mandat("123456789"), contexteSociete, maintenant)
    .some((a) => a.code === "siret_different"));
verifie("un numero mal lu n'est pas compare",
  !anomaliesPiece(mandat("1234"), contexteSociete, maintenant)
    .some((a) => a.code === "siret_different"));
verifie("sans Siret au dossier, rien n'est reproche",
  !anomaliesPiece(mandat("98765432100019"), contexte, maintenant)
    .some((a) => a.code === "siret_different"));

// « Co-titulaire : double signature » releve de la meme limite que les autres
// signatures : compter des traits d'encre dans un cadre revient a les lire. Le
// point est passe dans les verifications laissees a l'oeil.
const avecCoTitulaire = (secondVendeur: boolean | undefined): Piece[] => [
  piece({
    document_id: "cg", type_document: "doc_3", nom_fichier: "cg.jpg", libelle: "Carte grise",
    extraction: { type_document: "carte_grise", lisible: true, co_titulaire: true },
  }),
  piece({
    document_id: "ce", type_document: "doc_1", nom_fichier: "cession.jpg",
    libelle: "Certificat de cession signé et tamponné (cerfa 15776*02)",
    extraction: {
      type_document: "certificat_cession", lisible: true,
      signatures: { vendeur: true, acheteur: true, second_vendeur: secondVendeur },
    },
  }),
];
verifie("la double signature n'est plus jugee automatiquement",
  !anomaliesDossier(avecCoTitulaire(false), [], contexte, true, [])
    .some((a) => a.code === "double_signature_manquante"));

// Cas de DEM-2026-08088 : chaque Z d'un VIN Volkswagen lu comme un 2.
const vinZeroDeux = anomaliesPiece(
  piece({ extraction: { type_document: "carte_grise", lisible: true, vin: "WVW222522A4155754" } }),
  { ...contexte, vin: "WVWZZZ5ZZA4155754" }, maintenant,
);
verifie("les Z lus 2 ne font pas un autre vehicule",
  !vinZeroDeux.some((a) => a.code === "vin_different"));

const vinVraimentAutre = anomaliesPiece(
  piece({ extraction: { type_document: "carte_grise", lisible: true, vin: "F2AX21CT2H2AA151C" } }),
  { ...contexte, vin: "W1K3F1CB8PN296533" }, maintenant,
);
verifie("un VIN d'un autre vehicule reste signale",
  vinVraimentAutre.some((a) => a.code === "vin_different"));

// Le Siret du mandataire est pre-imprime sur le cerfa : le lire a la place de
// celui du mandant accusait sept dossiers d'affilee du meme numero.
verifie("le Siret du mandataire n'est plus confondu avec celui du mandant",
  !anomaliesPiece(
    piece({
      type_document: "doc_5", libelle: "Mandat signé et tamponné (cerfa 13757*03)", nom_fichier: "m.jpg",
      extraction: { type_document: "mandat", lisible: true, siret: "83088827700027" },
    }),
    { ...contexte, mandat_data: { mandant_siret: "10247419400010" } }, maintenant,
  ).some((a) => a.code === "siret_different"));

// Cas de DEM-2026-08218 : trois pieces portent la meme plaque, le dossier une
// autre. Un seul fait, donc une seule phrase -- et le nombre de pieces d'accord
// est ce qui permet de trancher entre faute de frappe au dossier et lettre mal
// lue sur une piece.
const troisPieces: Piece[] = ["p1", "p2", "p3"].map((id) => piece({
  document_id: id, nom_fichier: `${id}.jpg`,
  extraction: { type_document: "certificat_cession", lisible: true, immatriculations: ["ES-949-FD"] },
}));
const surPlaque = anomaliesDossier(troisPieces, [], { ...contexte, immatriculation: "ES-949-RD" }, true, []);
const plaques = surPlaque.filter((a) => a.code === "plaque_differente");
verifie("une seule ligne pour trois pieces d'accord", plaques.length === 1);
verifie("et elle compte les pieces",
  plaques[0]?.message === "Le dossier dit ES-949-RD alors que 3 documents disent ES-949-FD.");

// Une seule piece manuscrite qui diverge, c'est peut-etre une mauvaise lecture :
// on fait regarder, on n'affirme pas (cas de DEM-2026-07473).
const unePiece = anomaliesDossier([troisPieces[0]], [], { ...contexte, immatriculation: "ES-949-RD" }, true, []);
verifie("une seule piece manuscrite : on invite a verifier",
  unePiece.find((a) => a.code === "plaque_differente")?.gravite === "moyenne");

// Sur un imprime -- carte grise, non-gage, recepisse -- la plaque se lit surement.
const surImprime = anomaliesDossier(
  [piece({
    document_id: "ng", nom_fichier: "ng.jpg", libelle: "Certificat de situation administrative (non-gage)",
    extraction: { type_document: "certificat_non_gage", lisible: true, immatriculations: ["FL-741-FY"] },
  })],
  [], { ...contexte, immatriculation: "BK-691-CG" }, true, [],
);
verifie("sur un imprime, le desaccord est affirme",
  surImprime.find((a) => a.code === "plaque_differente")?.gravite === "haute");

// Deux lectures differentes d'une meme plaque : du bruit, pas un desaccord.
const lecturesDiscordantes = anomaliesDossier(
  [
    piece({ document_id: "a", nom_fichier: "a.jpg", libelle: "Certificat de cession",
      extraction: { type_document: "certificat_cession", lisible: true, immatriculations: ["ER-664-UN"] } }),
    piece({ document_id: "b", nom_fichier: "b.jpg", libelle: "Déclaration d'achat",
      extraction: { type_document: "declaration_achat", lisible: true, immatriculations: ["EB-664-UN"] } }),
  ],
  [], { ...contexte, immatriculation: "EB-664-VN" }, true, [],
);
verifie("deux lectures qui se contredisent ne virent pas au rouge",
  lecturesDiscordantes.filter((a) => a.code === "plaque_differente").every((a) => a.gravite === "moyenne"));

const plaqueConforme = anomaliesDossier(troisPieces, [], { ...contexte, immatriculation: "ES-949-FD" }, true, []);
verifie("plaque conforme : rien a signaler",
  !plaqueConforme.some((a) => a.code === "plaque_differente"));

// Cas de DEM-2026-08216 : le non-gage mentionne « certificat perdu » et
// « duplicata ». Le guide n'arrete la demarche que sur opposition, gage ou
// saisie : le vehicule est libre, il reste a verifier qu'on depose le duplicata.
const certificatSituation = (mentions: string[]) => anomaliesPiece(
  piece({
    libelle: "Certificat de situation administrative (non-gage)", nom_fichier: "ng.jpg",
    extraction: {
      type_document: "certificat_non_gage", lisible: true,
      situation_administrative: { vierge: false, mentions },
    },
  }),
  contexte, maintenant,
);
verifie("perdu et duplicata n'arretent pas la demarche",
  !certificatSituation(["Certificat d'immatriculation perdu", "Certificat d'immatriculation duplicata"])
    .some((a) => a.code === "situation_non_vierge"));
verifie("mais on previent de verifier le duplicata",
  certificatSituation(["Certificat d'immatriculation perdu"])
    .some((a) => a.code === "titre_refait" && a.gravite === "moyenne"));
verifie("une opposition arrete toujours",
  certificatSituation(["Opposition au transfert du certificat d'immatriculation (OTCI)"])
    .some((a) => a.code === "situation_non_vierge" && a.gravite === "haute"));
verifie("un gage aussi, meme accompagne d'un duplicata",
  certificatSituation(["Certificat d'immatriculation duplicata", "Gage"])
    .some((a) => a.code === "situation_non_vierge" && a.gravite === "haute"));

// « Vous devez expressement etre mandate par l'ancien titulaire » (page 12).
const mandatEtCession = (nomMandant: string): Piece[] => [
  piece({
    document_id: "m", nom_fichier: "mandat.jpg", libelle: "Mandat signé du vendeur",
    extraction: {
      type_document: "mandat", lisible: true,
      personnes: [{ role: "mandant", nom: nomMandant.split(" ").slice(1).join(" "), prenom: nomMandant.split(" ")[0] }],
    },
  }),
  piece({
    document_id: "c", nom_fichier: "cession.jpg", libelle: "Certificat de cession",
    extraction: {
      type_document: "certificat_cession", lisible: true,
      personnes: [{ role: "vendeur", nom: "DUPONT", prenom: "Jean" }],
    },
  }),
];
const ctxDC: ContexteDossier = { ...contexte, type: "DC" };
verifie("un mandat donne par un tiers est signale",
  anomaliesDossier(mandatEtCession("Marc LEROY"), [], ctxDC, true, [])
    .some((a) => a.code === "mandant_different"));
verifie("le mandat du vendeur lui-meme passe",
  !anomaliesDossier(mandatEtCession("Jean DUPONT"), [], ctxDC, true, [])
    .some((a) => a.code === "mandant_different"));
verifie("hors DC, la regle ne s'applique pas",
  !anomaliesDossier(mandatEtCession("Marc LEROY"), [], { ...contexte, type: "DA" }, true, [])
    .some((a) => a.code === "mandant_different"));

// Cas de DEM-2026-05309 : le modele avait lu la date de naissance a la place de
// la fin de validite, et annoncait une carte « perimee depuis le 20/11/2000 »
// alors qu'elle expire le 01/04/2035.
const identite = (dates: Record<string, string>) => anomaliesPiece(
  piece({
    libelle: "Pièce d'identité du vendeur (recto/verso)", nom_fichier: "cni.jpg",
    extraction: { type_document: "carte_identite", lisible: true, dates },
  }),
  contexte, maintenant,
);
verifie("une date de naissance prise pour une expiration ne perime rien",
  !identite({ validite: "2000-11-20", naissance: "2000-11-20" })
    .some((a) => a.code === "piece_perimee"));
verifie("une expiration vieille de plus de quinze ans est une mauvaise lecture",
  !identite({ validite: "1980-12-17" }).some((a) => a.code === "piece_perimee"));
verifie("une piece reellement perimee reste signalee",
  identite({ validite: "2025-02-10" }).some((a) => a.code === "piece_perimee"));
verifie("une piece en cours de validite ne declenche rien",
  !identite({ validite: "2035-04-01", naissance: "2000-11-20" })
    .some((a) => a.code === "piece_perimee"));

// Cas de DEM-2026-05442 : ancienne carte d'identite deposee recto seul. La date
// d'expiration est au verso, donc la validite est invérifiable -- et ce n'est
// pas « perimee » qu'il faut dire, mais qu'il manque une face.
const rectoSeul = (extra: Partial<Piece>[] = []): Piece[] => [
  piece({
    document_id: "r", type_document: "doc_2", nom_fichier: "cni.jpg",
    libelle: "Pièce d'identité du vendeur (recto/verso)",
    extraction: { type_document: "carte_identite", lisible: true, face: "recto", dates: { naissance: "1980-12-17" } },
  }),
  ...extra.map((e) => piece(e)),
];
verifie("une identite recto seul sans date de validite : on reclame le verso",
  anomaliesDossier(rectoSeul(), [], contexte, true, [])
    .some((a) => a.code === "verso_manquant" && a.gravite === "moyenne"));
verifie("le verso depose a part suffit",
  !anomaliesDossier(rectoSeul([{
    document_id: "v", type_document: "doc_2_verso", nom_fichier: "cni2.jpg",
    libelle: "Pièce d'identité du vendeur (recto/verso) (verso)",
    extraction: { type_document: "carte_identite", lisible: true, face: "verso" },
  }]), [], contexte, true, []).some((a) => a.code === "verso_manquant"));
verifie("une nouvelle carte, dont la validite se lit au recto, ne declenche rien",
  !anomaliesDossier([piece({
    document_id: "n", type_document: "doc_2", nom_fichier: "cni.jpg",
    libelle: "Pièce d'identité du vendeur (recto/verso)",
    extraction: { type_document: "carte_identite", lisible: true, face: "recto", dates: { validite: "2035-04-01" } },
  })], [], contexte, true, []).some((a) => a.code === "verso_manquant"));

// Quand le vendeur est une societe, la piece fournie est celle du dirigeant :
// le guide l'exige ainsi. Comparer son nom a la raison sociale produisait
// dix-huit faux signalements sur vingt.
const identiteContre = (vendeur: { nom: string; est_une_societe?: boolean }): Piece[] => [
  piece({
    document_id: "i", type_document: "doc_2", nom_fichier: "cni.jpg",
    libelle: "Pièce d'identité du vendeur (recto/verso)",
    extraction: {
      type_document: "carte_identite", lisible: true, face: "recto_verso",
      dates: { validite: "2035-01-01" },
      personnes: [{ role: "titulaire", nom: "THORAL", prenom: "Damien" }],
    },
  }),
  piece({
    document_id: "c", type_document: "doc_1", nom_fichier: "cession.jpg",
    libelle: "Certificat de cession signé (cerfa 15776*02)",
    extraction: {
      type_document: "certificat_cession", lisible: true,
      personnes: [{ role: "vendeur", nom: vendeur.nom, est_une_societe: vendeur.est_une_societe }],
    },
  }),
];
verifie("le gerant face a sa societe ne declenche rien",
  !anomaliesDossier(identiteContre({ nom: "H2A AUTO" }), [], contexte, true, [])
    .some((a) => a.code === "nom_different"));
verifie("une societe annoncee par le modele non plus",
  !anomaliesDossier(identiteContre({ nom: "DUMONT D'URVILLE", est_une_societe: true }), [], contexte, true, [])
    .some((a) => a.code === "nom_different"));
verifie("deux personnes physiques differentes restent signalees",
  anomaliesDossier(identiteContre({ nom: "MASSOUDI", est_une_societe: false }), [], contexte, true, [])
    .some((a) => a.code === "nom_different"));
verifie("la meme personne ne declenche rien",
  !anomaliesDossier(identiteContre({ nom: "THORAL" }), [], contexte, true, [])
    .some((a) => a.code === "nom_different"));

// L'heure de cession est passee dans l'encadre « A verifier vous-meme » : la
// signaler aussi comme champ vide la comptait deux fois, dont une a tort.
verifie("l'heure de cession n'est plus reprochee comme champ vide",
  !champObligatoireSiv("heure de cession"));
verifie("ni dans ses variantes",
  !champObligatoireSiv("heure de cession (acheteur)"));
verifie("une case que le modele dit sans objet non plus",
  !champObligatoireSiv("date de naissance de l'acheteur (non applicable ici)"));
verifie("la date de cession reste exigee",
  champObligatoireSiv("date de cession"));
verifie("l'identite du vendeur aussi",
  champObligatoireSiv("identité du vendeur"));

// Cas de DEM-2026-08238 : la carte d'identite deposee en deux fichiers. Le recto
// donnait 09/02/2035, le verso avait ete mal lu 10/02/2025 -- le controle avait
// la bonne date sous les yeux et signalait l'autre.
const faceMalLue = anomaliesPiece(
  piece({
    libelle: "Pièce d'identité du vendeur (recto/verso)", nom_fichier: "IMG_0754.jpg",
    validiteAilleurs: true,
    extraction: { type_document: "carte_identite", lisible: true, dates: { validite: "2025-02-10" } },
  }),
  contexte, maintenant,
);
verifie("une face valable couvre la face mal lue",
  !faceMalLue.some((a) => a.code === "piece_perimee"));

const vraimentPerimee = anomaliesPiece(
  piece({
    libelle: "Pièce d'identité du vendeur (recto/verso)", nom_fichier: "cni.jpg",
    validiteAilleurs: false,
    extraction: { type_document: "carte_identite", lisible: true, dates: { validite: "2022-06-12" } },
  }),
  contexte, maintenant,
);
verifie("sans autre face valable, la peremption reste signalee",
  vraimentPerimee.some((a) => a.code === "piece_perimee"));

// Le message d'une piece manquante ne repete plus son nom -- l'interface
// l'affiche deja devant -- et dit ce qu'on veut savoir : est-elle obligatoire.
const manquePendantDepot = anomaliesDossier([], ["Pièce d'identité du dirigeant (recto/verso)"], contexte, false, []);
verifie("pendant le depot, on dit qu'elle est obligatoire et attendue",
  manquePendantDepot.some((a) => a.code === "piece_manquante"
    && a.message === "Obligatoire, pas encore déposée."
    && a.piece === "la pièce d'identité du dirigeant"));

const manqueApresDepot = anomaliesDossier([], ["Pièce d'identité du dirigeant (recto/verso)"], contexte, true, []);
verifie("depot termine, elle est absente et c'est grave",
  manqueApresDepot.some((a) => a.code === "piece_manquante"
    && a.message === "Obligatoire, et absente du dossier."
    && a.gravite === "haute"));

// Cas de DEM-2026-07557 : vehicule etranger, mandat portant « PC5467 ». Le
// controle affirmait que le vehicule n'y etait pas identifie -- il l'etait, par
// une plaque qui n'a pas le format francais.
const mandatAvec = (immatriculations: string[]) => anomaliesPiece(
  piece({
    type_document: "doc_5", libelle: "Mandat signé et tamponné (cerfa 13757*03)", nom_fichier: "mandat.jpg",
    extraction: { type_document: "mandat", lisible: true, immatriculations },
  }),
  { ...contexte, immatriculation: null }, maintenant,
);
verifie("une plaque etrangere identifie le vehicule",
  !mandatAvec(["PC5467"]).some((a) => a.code === "vehicule_non_identifie"));
verifie("un mandat sans aucun identifiant reste signale",
  mandatAvec([]).some((a) => a.code === "vehicule_non_identifie"));

// Suite de DEM-2026-07557 : deux reproches qui decoulaient de la meme hypothese
// d'un vehicule francais et d'une piece conforme.
verifie("une plaque etrangere dispense de reclamer le VIN",
  !anomaliesPiece(
    piece({
      type_document: "doc_5", libelle: "Mandat signé et tamponné (cerfa 13757*03)", nom_fichier: "m.jpg",
      extraction: { type_document: "mandat", lisible: true, immatriculations: ["PC5467"], champs_incomplets: ["VIN"] },
    }),
    { ...contexte, immatriculation: null }, maintenant,
  ).some((a) => a.code === "champ_vide"));

verifie("on ne juge pas l'anciennete d'un document qui n'est pas la piece attendue",
  !anomaliesPiece(
    piece({
      libelle: "Certificat de situation administrative (non-gage)", nom_fichier: "autre.jpg",
      extraction: { type_document: "autre", correspond: false, lisible: true, dates: { emission: "2024-03-01" } },
    }),
    contexte, maintenant,
  ).some((a) => a.code === "piece_trop_ancienne"));

// Cas de DEM-2026-08276 : un meme fichier produisait trois lignes -- « n'est pas
// lisible », « elle est floue », « elle est trop sombre ». Un seul fait.
const illisibleEtFloue = anomaliesPiece(
  piece({
    nom_fichier: "image.jpg",
    extraction: { type_document: "autre", correspond: true, lisible: false, defauts: ["flou", "sombre"] },
  }),
  contexte, maintenant,
);
const qualite = illisibleEtFloue.filter((a) => a.code === "illisible" || a.code.startsWith("qualite"));
verifie("une seule ligne pour une piece illisible", qualite.length === 1);
verifie("et elle dit pourquoi",
  qualite[0]?.message.includes("floue") && qualite[0]?.message.includes("sombre"));

// Cas de DEM-2026-07355 : le modele repondait « illisible » tout en listant huit
// rubriques non remplies. Enumerer les cases vides d'un formulaire, c'est l'avoir
// lu -- et le dossier virait au rouge sur un document lisible a l'oeil.
const ditIllisibleMaisLu = anomaliesPiece(
  piece({
    nom_fichier: "Document numérisé 4.pdf",
    libelle: "Déclaration d'achat signée et tamponnée (cerfa 13751*02)",
    extraction: {
      type_document: "declaration_achat", lisible: false,
      champs_incomplets: ["date de cession (vendeur)", "kilométrage"],
    },
  }),
  contexte, maintenant,
);
verifie("un formulaire dont on lit les cases n'est pas illisible",
  !ditIllisibleMaisLu.some((a) => a.code === "illisible"));

// Cas de DEM-2026-07473 : une FIV deposee a la place de la carte grise. Ce n'est
// pas le meme document, et l'emplacement reste donc a combler.
verifie("une FIV ne comble pas l'emplacement de la carte grise",
  !appartientALaFamille('Carte grise barrée avec la mention "Vendu le"', "fiche_identification_vehicule"));
verifie("et elle est signalee comme n'etant pas la piece demandee",
  horsSujet('Carte grise barrée avec la mention "Vendu le"', "fiche_identification_vehicule"));

// « L'ancien titulaire » au sens du guide, c'est celui que porte la carte grise,
// et son nom y est imprime -- plus sur qu'une mention manuscrite sur la cession.
const avecCarteGrise = (titulaire: string, mandantNom: string): Piece[] => [
  piece({
    document_id: "cg", type_document: "doc_3", nom_fichier: "cg.jpg", libelle: "Carte grise barrée",
    extraction: {
      type_document: "carte_grise", lisible: true,
      personnes: [{ role: "titulaire", nom: titulaire, est_une_societe: true }],
    },
  }),
  piece({
    document_id: "m", type_document: "doc_5", nom_fichier: "mandat.jpg", libelle: "Mandat signé du vendeur",
    extraction: {
      type_document: "mandat", lisible: true,
      personnes: [{ role: "mandant", nom: mandantNom, est_une_societe: true }],
    },
  }),
];
// Un professionnel qui a achete en DA revend un vehicule dont la carte grise
// est restee au nom de l'ancien proprietaire : c'est la cession qui dit qui
// vend, jamais la carte grise (cas de DEM-2026-07599).
verifie("le titulaire de la carte grise n'est pas la reference",
  !anomaliesDossier(
    [...avecCarteGrise("JEAN-LUC PROVOST", "SASU 4 ROUES"),
     piece({ document_id: "c2", type_document: "doc_1", nom_fichier: "cession.jpg",
       libelle: "Certificat de cession",
       extraction: { type_document: "certificat_cession", lisible: true,
         personnes: [{ role: "vendeur", nom: "SASU 4 ROUES", est_une_societe: true }] } })],
    [], ctxDC, true, []).some((a) => a.code === "mandant_different"));

// Le non-gage est remis au moment de la vente : c'est a ce jour-la qu'il doit
// avoir moins de quinze jours, pas aujourd'hui. Sur DEM-2026-07426, un
// certificat frais le jour de la cession etait annonce « 190 jours ».
const nonGageDu = (emission: string, ctx: Partial<ContexteDossier>) => anomaliesPiece(
  piece({
    libelle: "Certificat de situation administrative (non-gage)", nom_fichier: "ng.jpg",
    extraction: { type_document: "certificat_non_gage", correspond: true, lisible: true, dates: { emission } },
  }),
  { ...contexte, ...ctx }, maintenant,
);
verifie("un non-gage frais le jour de la vente ne vieillit pas dans la file",
  !nonGageDu("2026-03-01", { date_cession: "2026-03-05" })
    .some((a) => a.code === "piece_trop_ancienne"));
verifie("un non-gage deja perime le jour de la vente est signale",
  nonGageDu("2026-03-01", { date_cession: "2026-04-15" })
    .some((a) => a.code === "piece_trop_ancienne"));
verifie("sans date de vente, on prend le jour du depot",
  !nonGageDu("2026-03-01", { depose_le: "2026-03-10" })
    .some((a) => a.code === "piece_trop_ancienne"));


// Un garage verifie a deja depose son Kbis et la piece d'identite de son
// dirigeant. Quand c'est lui le vendeur -- sept cessions sur huit a vendeur
// societe -- ces pieces sont deja chez nous : on ne les redemande pas.
const ctxGarageVend: ContexteDossier = { ...contexte, le_garage_vend: true };

verifie("on ne reclame pas une identite qu'on detient deja",
  !anomaliesDossier([], ["Pièce d'identité du vendeur (recto/verso)"], ctxGarageVend, true, [])
    .some((a) => a.code === "piece_manquante"));
verifie("et un Kbis depose a cet emplacement n'est plus une mauvaise piece",
  !anomaliesPiece(
    piece({
      type_document: "doc_2", libelle: "Pièce d'identité du vendeur (recto/verso)", nom_fichier: "kbis.pdf",
      extraction: { type_document: "kbis", correspond: false, lisible: true },
    }),
    ctxGarageVend, maintenant,
  ).some((a) => a.code === "mauvaise_piece"));
verifie("quand le vendeur n'est pas le garage, l'identite reste exigee",
  anomaliesDossier([], ["Pièce d'identité du vendeur (recto/verso)"], contexte, true, [])
    .some((a) => a.code === "piece_manquante"));

// Cas de DEM-2026-04906 : ancienne carte d'identite, recto seul. Elle n'a pas de
// date d'expiration dans la zone de lecture automatique, et le modele en a
// fabrique une a partir du numero de carte -- delivree en 1961, valable
// jusqu'en 2026. Un titre vaut dix a quinze ans, pas soixante-cinq.
verifie("une duree de validite invraisemblable n'est pas retenue",
  !identite({ emission: "1961-04-03", validite: "2026-07-06", naissance: "1951-04-03" })
    .some((a) => a.code === "piece_perimee"));
verifie("une duree normale reste jugee",
  identite({ emission: "2012-06-13", validite: "2022-06-12" })
    .some((a) => a.code === "piece_perimee"));
verifie("sans date de delivrance, les autres garde-fous suffisent",
  identite({ validite: "2025-02-10" }).some((a) => a.code === "piece_perimee"));

console.log(echecs === 0 ? "\nTOUT PASSE" : `\n${echecs} ECHEC(S)`);
