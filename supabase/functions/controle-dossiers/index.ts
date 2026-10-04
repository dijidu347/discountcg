// Contrôle automatique des dossiers.
//
// Deux temps à chaque passage :
//   1. les pièces déposées depuis le dernier passage sont lues par le modèle ;
//   2. les dossiers concernés sont recontrôlés, pièce par pièce puis dans leur
//      ensemble, et le résultat est rangé dans `controles_demarche`.
//
// Appelée par pg_cron toutes les deux minutes, ou à la demande depuis la fiche
// admin avec { demarche_id }. Rien n'est bloqué côté garage : le contrôle
// s'affiche, il ne décide pas.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { libellePiece } from "../_shared/libellesPieces.ts";
import { lirePiece, type Source } from "./lecture.ts";
import {
  anomaliesDossier,
  anomaliesPiece,
  libelleCourt,
  selonLeCerfa,
  memePersonne,
  doublonsParFichier,
  appartientALaFamille,
  estPieceLibre,
  niveauDossier,
  type Anomalie,
  type ContexteDossier,
  type Extraction,
  type Piece,
} from "./regles.ts";

const LOT_DEFAUT = 12;
const TENTATIVES_MAX = 3;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MIMES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  jfif: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
};

// Les photos iPhone ne sont lisibles ni par le modèle ni par le logiciel du
// SIV : inutile de payer une lecture, la règle les signale sur le seul nom du
// fichier.
const FORMATS_ILLISIBLES = new Set(["heic", "heif"]);

// Les URL stockées prennent plusieurs formes selon l'époque de dépôt
// (`/object/`, `/object/public/`, `/object/sign/`) : on retrouve le seau et le
// chemin dans tous les cas.
function cheminStockage(url: string): { seau: string; chemin: string } | null {
  const apres = url.split("/storage/v1/object/")[1];
  if (!apres) return null;
  const sansPrefixe = apres.replace(/^(public|sign|authenticated)\//, "").split("?")[0];
  const morceaux = sansPrefixe.split("/");
  const seau = morceaux.shift();
  if (!seau || morceaux.length === 0) return null;
  return { seau, chemin: morceaux.map(decodeURIComponent).join("/") };
}

async function empreinteDe(octets: Uint8Array): Promise<string> {
  // Le tampon sous-jacent peut être un ArrayBufferLike : on le restreint
  // explicitement pour satisfaire la signature de `digest`.
  const condensat = await crypto.subtle.digest(
    "SHA-256",
    octets.slice().buffer as ArrayBuffer,
  );
  return [...new Uint8Array(condensat)].map((o) => o.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if ((req.headers.get("Authorization") ?? "") !== `Bearer ${serviceKey}`) {
    return json({ error: "Non autorisé" }, 401);
  }

  // Tant que la clé n'est pas posée, le contrôle reste en sommeil : le cron
  // tourne dans le vide sans remplir les journaux d'erreurs, et les pièces
  // déposées entre-temps attendent sagement dans la file.
  const cleModele = Deno.env.get("MISTRAL_API_KEY") ?? "";
  if (!cleModele) return json({ enSommeil: true, motif: "MISTRAL_API_KEY absente" });

  const supabase = createClient(supabaseUrl, serviceKey);
  const corps = await req.json().catch(() => ({}));
  const demarcheDemandee: string | null = corps?.demarche_id ?? null;
  const lot: number = Math.min(Number(corps?.lot) || LOT_DEFAUT, 40);

  // 1. Les pièces qui attendent d'être lues.
  let requete = supabase
    .from("analyses_documents")
    .select("id, document_id, demarche_id, tentatives, documents!inner(type_document, document_type, nom_fichier, url, taille_octets), demarches!inner(status)")
    .eq("statut", "en_attente")
    .not("demarches.status", "in", "(finalise,refuse,en_saisie)")
    .lt("tentatives", TENTATIVES_MAX)
    .order("cree_le", { ascending: true })
    .limit(lot);
  if (demarcheDemandee) requete = requete.eq("demarche_id", demarcheDemandee);

  const { data: aLire, error: erreurFile } = await requete;
  if (erreurFile) return json({ error: erreurFile.message }, 500);

  const demarchesTouchees = new Set<string>(demarcheDemandee ? [demarcheDemandee] : []);
  let lues = 0;
  let echecs = 0;

  for (const ligne of aLire ?? []) {
    const doc = (ligne as Record<string, unknown>).documents as {
      type_document: string; document_type: string | null; nom_fichier: string; url: string; taille_octets: number | null;
    };
    if (ligne.demarche_id) demarchesTouchees.add(ligne.demarche_id);

    try {
      const emplacement = cheminStockage(doc.url);
      if (!emplacement) throw new Error("Chemin de stockage introuvable");

      const { data: fichier, error: erreurFichier } = await supabase.storage
        .from(emplacement.seau)
        .download(emplacement.chemin);
      if (erreurFichier || !fichier) throw new Error(`Téléchargement impossible : ${erreurFichier?.message ?? "fichier vide"}`);

      const octets = new Uint8Array(await fichier.arrayBuffer());
      const empreinte = await empreinteDe(octets);
      const extension = (doc.nom_fichier.split(".").pop() ?? "").toLowerCase();

      if (FORMATS_ILLISIBLES.has(extension)) {
        await supabase.from("analyses_documents").update({
          statut: "ok",
          modele: null,
          type_detecte: "illisible",
          extraction: {},
          empreinte,
          erreur: null,
          tentatives: ligne.tentatives + 1,
          analyse_le: new Date().toISOString(),
        }).eq("id", ligne.id);
        lues++;
        continue;
      }

      const mime = MIMES[extension];
      if (!mime) throw new Error(`Format non pris en charge : ${extension || "sans extension"}`);

      // Les PDF partent par un lien signé : Mistral va les chercher lui-même
      // et les passe à son OCR, ce qu'un envoi encodé ne déclenche pas.
      let source: Source;
      if (mime === "application/pdf") {
        const { data: lien, error: erreurLien } = await supabase.storage
          .from(emplacement.seau)
          .createSignedUrl(emplacement.chemin, 600);
        if (erreurLien || !lien?.signedUrl) throw new Error(`Lien signé impossible : ${erreurLien?.message ?? "vide"}`);
        source = { genre: "pdf", url: lien.signedUrl };
      } else {
        source = { genre: "image", mimeType: mime, octets };
      }

      const contexte = await contexteDeLecture(supabase, ligne.demarche_id, doc.type_document, doc.document_type);
      const { extraction, modele } = await lirePiece(cleModele, source, contexte);

      await supabase.from("analyses_documents").update({
        statut: "ok",
        modele,
        piece_attendue: contexte.libellePiece,
        type_detecte: extraction.type_document ?? null,
        extraction,
        empreinte,
        erreur: null,
        tentatives: ligne.tentatives + 1,
        analyse_le: new Date().toISOString(),
      }).eq("id", ligne.id);
      lues++;
    } catch (erreur) {
      echecs++;
      const message = erreur instanceof Error ? erreur.message : String(erreur);
      const tentatives = ligne.tentatives + 1;
      await supabase.from("analyses_documents").update({
        statut: tentatives >= TENTATIVES_MAX ? "erreur" : "en_attente",
        erreur: message.slice(0, 500),
        tentatives,
      }).eq("id", ligne.id);
    }
  }

  // 2. Les dossiers dont une pièce vient d'être lue.
  let dossiers = 0;
  for (const demarcheId of demarchesTouchees) {
    try {
      await recontroler(supabase, demarcheId);
      dossiers++;
    } catch (erreur) {
      console.error("Contrôle du dossier", demarcheId, erreur);
    }
  }

  return json({ lues, echecs, dossiers });
});

// Libellés des pièces `doc_1`, `doc_2`… d'une démarche, lus dans la
// configuration de l'action correspondante.
const cacheLibelles = new Map<string, Record<string, string>>();

async function libellesDocN(
  supabase: any,
  typeDemarche: string,
): Promise<Record<string, string>> {
  const enCache = cacheLibelles.get(typeDemarche);
  if (enCache) return enCache;

  const { data: action } = await supabase.from("actions_rapides").select("id").eq("code", typeDemarche).maybeSingle();
  const libelles: Record<string, string> = {};
  if (action?.id) {
    const { data: pieces } = await supabase
      .from("action_documents")
      .select("nom_document, ordre, obligatoire")
      .eq("action_id", action.id)
      .order("ordre");
    (pieces ?? []).forEach((piece: any, index: number) => {
      libelles[`doc_${index + 1}`] = piece.nom_document;
    });
  }
  cacheLibelles.set(typeDemarche, libelles);
  return libelles;
}

// Pièces obligatoires d'une démarche, telles qu'elles l'étaient le jour où elle
// a été ouverte.
//
// Une exigence qui change ne vaut que pour la suite : les dossiers déjà déposés
// l'ont été sur l'ancienne liste, et leur réclamer une pièce que personne ne
// leur avait demandée serait leur faire payer notre correction. La date portée
// sur la pièce dit à partir de quand elle compte.
// Le cerfa 13751 exige, « en cas d'achat du véhicule à un autre professionnel »,
// la copie du récépissé de la précédente déclaration d'achat. Entre particulier
// et garage, il n'existe pas : le réclamer systématiquement reviendrait à
// signaler un manque sur la majorité des ventes. La question est posée au garage
// au moment de la démarche, et c'est sa réponse qui décide.
async function venduParUnProfessionnel(supabase: any, demarcheId: string): Promise<boolean> {
  const { data } = await supabase
    .from("demarche_questionnaire_responses")
    .select("question_text, answer_text")
    .eq("demarche_id", demarcheId);
  const reponse = (data ?? []).find((r: any) => /professionnel/i.test(r.question_text ?? ""));
  return /oui/i.test(reponse?.answer_text ?? "");
}

// Qui vend, sur une DC. La page 13 du guide a deux colonnes selon le vendeur :
// un particulier donne sa pièce d'identité, une société donne son Kbis et la
// pièce de son dirigeant. Et un troisième cas, extérieur au guide : le garage
// qui vend sa propre voiture nous a déjà remis les deux en se faisant vérifier.
// Sans réponse — un dossier déposé avant que la question existe — on en reste à
// ce qui lui avait été demandé, pas davantage.
type QualiteVendeur = "garage" | "particulier" | "societe" | null;

async function qualiteDuVendeur(supabase: any, demarcheId: string): Promise<QualiteVendeur> {
  const { data } = await supabase
    .from("demarche_questionnaire_responses")
    .select("question_text, answer_text")
    .eq("demarche_id", demarcheId);
  const reponse = (data ?? []).find((r: any) => /qui vend/i.test(r.question_text ?? ""));
  const texte = reponse?.answer_text ?? "";
  if (/garage/i.test(texte)) return "garage";
  if (/particulier/i.test(texte)) return "particulier";
  if (/soci[ée]t[ée]/i.test(texte)) return "societe";
  return null;
}

async function pieceObligatoires(
  supabase: any,
  typeDemarche: string,
  ouvertLe: string | null,
  venduParPro = false,
  vendeur: QualiteVendeur = null,
): Promise<{ code: string; libelle: string }[]> {
  const { data: action } = await supabase.from("actions_rapides").select("id").eq("code", typeDemarche).maybeSingle();
  if (!action?.id) return [];
  const { data: pieces } = await supabase
    .from("action_documents")
    .select("nom_document, ordre, obligatoire, obligatoire_depuis")
    .eq("action_id", action.id)
    .order("ordre");

  const jourDuDossier = ouvertLe ? ouvertLe.slice(0, 10) : null;
  return (pieces ?? [])
    .map((piece: any, index: number) => ({
      code: `doc_${index + 1}`,
      libelle: piece.nom_document,
      obligatoire: piece.obligatoire,
      depuis: piece.obligatoire_depuis as string | null,
    }))
    // Le récépissé de la précédente déclaration d'achat est la seule pièce que
    // le SIV exige sous condition, et seulement sur une DA : la page 16 la
    // réclame « en cas d'achat du véhicule à un autre professionnel ». La page
    // 13, qui liste les pièces d'une DC, ne la mentionne pas. Le formulaire de
    // dépôt ne peut pas exprimer cette condition — sa case « obligatoire » vaut
    // pour tout le monde ou pour personne — donc c'est le contrôle qui la porte.
    //
    // Sur une DC, les pièces d'identité dépendent de qui vend : rien de plus
    // quand c'est le garage lui-même, sa pièce d'identité quand c'est un
    // particulier, son Kbis en plus quand c'est une autre société.
    .filter((piece: any) =>
      piece.obligatoire
      || (/r[ée]c[ée]piss[ée]/i.test(piece.libelle) && venduParPro && typeDemarche === "DA")
      || (/identit[ée] du vendeur/i.test(piece.libelle) && typeDemarche === "DC" && vendeur !== "garage")
      || (/kbis/i.test(piece.libelle) && typeDemarche === "DC" && vendeur === "societe"))
    .filter((piece: any) => !piece.depuis || !jourDuDossier || jourDuDossier >= piece.depuis)
    .filter((piece: any) =>
      !/r[ée]c[ée]piss[ée]/i.test(piece.libelle) || (venduParPro && typeDemarche === "DA"))
    .map(({ code, libelle }: any) => ({ code, libelle }));
}

async function contexteDeLecture(
  supabase: any,
  demarcheId: string | null,
  typeDocument: string,
  nomLibre: string | null,
) {
  const { data: demarche } = demarcheId
    ? await supabase
        .from("demarches")
        .select("type, immatriculation, marque, modele, client_nom, client_prenom, vehicule_id")
        .eq("id", demarcheId)
        .maybeSingle()
    : { data: null };

  const typeDemarche = demarche?.type ?? "";
  const libelles = typeDemarche ? await libellesDocN(supabase, typeDemarche) : {};

  let vin: string | null = null;
  if (demarche?.vehicule_id) {
    const { data: vehicule } = await supabase.from("vehicules").select("vin").eq("id", demarche.vehicule_id).maybeSingle();
    vin = vehicule?.vin ?? null;
  }

  return {
    libellePiece: libellePiece(typeDocument, libelles, nomLibre),
    pieceLibre: estPieceLibre(typeDocument),
    typeDemarche: typeDemarche || "démarche d'immatriculation",
    immatriculation: demarche?.immatriculation ?? null,
    vin,
    vehicule: [demarche?.marque, demarche?.modele].filter(Boolean).join(" ") || null,
    titulaire: [demarche?.client_prenom, demarche?.client_nom].filter(Boolean).join(" ") || null,
  };
}

async function recontroler(supabase: any, demarcheId: string) {
  const { data: demarche } = await supabase
    .from("demarches")
    .select("type, immatriculation, marque, modele, client_nom, client_prenom, client_adresse, mandat_data, documents_complets, vehicule_id, garage_id, created_at, status, garages(raison_sociale, is_verified, kbis_valide_jusqu_au)")
    .eq("id", demarcheId)
    .maybeSingle();
  if (!demarche) return;

  // Filet : un dossier hors périmètre n'a rien à faire ici, et surtout ne doit
  // pas afficher de pièces manquantes calculées sur une liste qu'on ne connaît
  // pas encore pour son type.
  const { data: actif } = await supabase
    .from("controle_types_actifs")
    .select("actif")
    .eq("type", demarche.type)
    .maybeSingle();
  if (actif?.actif !== true) return;

  // Un dossier terminé ne se contrôle pas : il est parti au SIV, ou il a été
  // refusé, ou annulé. Le relire ne sert à rien et coûte une lecture.
  // Les seuls statuts terminaux de l'énumération : il n'existe pas d'« annulé ».
  //
  // « En saisie » non plus : le garage remplit encore son dossier, il ne l'a pas
  // envoyé, et il n'apparaît nulle part chez l'administration. Sur 129 dossiers
  // contrôlés le 1er octobre, 34 étaient dans ce cas — un quart des lectures
  // payées pour des dossiers que personne ne traitera, et treize faux rouges
  // dans une liste censée ne contenir que du travail réel.
  const HORS_PERIMETRE = ["finalise", "refuse", "en_saisie"];
  if (HORS_PERIMETRE.includes(demarche.status ?? "")) return;

  const { data: documents } = await supabase
    .from("documents")
    .select("id, type_document, document_type, nom_fichier, taille_octets, created_at, validation_status")
    .eq("demarche_id", demarcheId)
    .order("created_at", { ascending: true });

  // Une pièce refusée puis renvoyée existe en double : seule la dernière version
  // de chaque emplacement est contrôlée.
  type Depot = {
    id: string; type_document: string; document_type: string | null;
    nom_fichier: string; taille_octets: number | null; created_at: string;
    validation_status: string | null;
  };
  const derniere = new Map<string, Depot>();
  // Une pièce déjà refusée est sortie du contrôle : elle a été jugée, le garage
  // doit la remplacer, et continuer à la lire revient à commenter un document
  // qui n'est plus dans le dossier. C'est ce qui faisait sortir des dates de
  // 2017 et 2020 lues sur des photos floues déjà écartées.
  const REFUSEES = ["rejected", "invalid"];
  for (const doc of (documents ?? []) as Depot[]) {
    if (doc.type_document?.startsWith("admin_")) continue;
    if (REFUSEES.includes(doc.validation_status ?? "")) continue;
    derniere.set(doc.type_document, doc);
  }
  const retenus = [...derniere.values()];

  const { data: analyses } = await supabase
    .from("analyses_documents")
    .select("document_id, statut, extraction, empreinte")
    .in("document_id", retenus.map((doc) => doc.id).slice(0, 200));
  type Analyse = { statut?: string; extraction?: Extraction | null; empreinte?: string | null };
  const parDocument = new Map((analyses ?? []).map((a: any) => [a.document_id, a] as [string, Analyse]));

  const libelles = await libellesDocN(supabase, demarche.type);
  const pieces: Piece[] = retenus.map((doc) => {
    const analyse = parDocument.get(doc.id) as Analyse | undefined;
    return {
      document_id: doc.id,
      type_document: doc.type_document,
      libelle: libellePiece(doc.type_document, libelles, doc.document_type),
      nom_fichier: doc.nom_fichier,
      taille_octets: doc.taille_octets,
      empreinte: analyse?.empreinte ?? null,
      extraction: analyse?.statut === "ok" ? selonLeCerfa(analyse.extraction) : null,
    };
  });

  let vin: string | null = null;
  let dateMec: string | null = null;
  if (demarche.vehicule_id) {
    const { data: vehicule } = await supabase
      .from("vehicules").select("vin, date_mec").eq("id", demarche.vehicule_id).maybeSingle();
    vin = vehicule?.vin ?? null;
    dateMec = vehicule?.date_mec ?? null;
  }

  // La date de la vente, lue sur la cession ou sur la déclaration d'achat : elle
  // sert de repère pour juger si une pièce était fraîche le jour où elle a
  // compté.
  const dateCession = pieces
    .map((p) => p.extraction?.dates?.cession)
    .find((d) => !!d) ?? null;

  // Un garage vérifié a déjà déposé son Kbis et la pièce d'identité de son
  // dirigeant, approuvés au moment de la vérification du compte. Quand c'est lui
  // le vendeur — ce qui est le cas de sept cessions sur huit où le vendeur est
  // une société — ces deux pièces sont déjà chez nous, et les redemander au
  // dossier n'aurait aucun sens.
  const garage = (demarche as Record<string, unknown>).garages as
    { raison_sociale?: string | null; is_verified?: boolean | null; kbis_valide_jusqu_au?: string | null } | null;

  const vendeurDeLaCession = pieces
    .find((p) => p.extraction?.type_document === "certificat_cession")
    ?.extraction?.personnes?.find((p) => (p.role ?? "").toLowerCase() === "vendeur");
  const nomDuVendeur = `${vendeurDeLaCession?.prenom ?? ""} ${vendeurDeLaCession?.nom ?? ""}`.trim();

  const contexte: ContexteDossier = {
    garage_nom: garage?.raison_sociale ?? null,
    garage_verifie: garage?.is_verified === true,
    kbis_valide_jusqu_au: garage?.kbis_valide_jusqu_au ?? null,
    le_garage_vend: garage?.is_verified === true
      && !!garage?.raison_sociale
      && !!nomDuVendeur
      && memePersonne(garage.raison_sociale, nomDuVendeur),
    date_cession: dateCession,
    depose_le: demarche.created_at ?? null,
    type: demarche.type,
    immatriculation: demarche.immatriculation,
    vin,
    client_nom: demarche.client_nom,
    client_prenom: demarche.client_prenom,
    client_adresse: demarche.client_adresse,
    mandat_data: demarche.mandat_data,
  };

  const deposees = new Set(retenus.map((doc) => doc.type_document));

  // Un fichier peut contenir deux pièces à la fois : sur DEM-2026-08141, la
  // carte grise barrée était photographiée posée sur la déclaration d'achat.
  // Tout ce que le modèle a reconnu sur une photo compte, pas seulement le
  // document principal.
  const typesVus = pieces.flatMap((piece) => [
    piece.extraction?.type_document,
    ...(piece.extraction?.autres_documents ?? []),
  ]);
  const attendues = await pieceObligatoires(
    supabase, demarche.type, demarche.created_at ?? null,
    await venduParUnProfessionnel(supabase, demarcheId),
    await qualiteDuVendeur(supabase, demarcheId),
  );

  // Après un refus, le garage renvoie ses pièces dans des cases « correction »
  // indifférenciées : l'emplacement d'origine reste vide alors que la pièce est
  // bien là. On rattache donc chaque pièce libre à l'emplacement qu'elle comble,
  // d'après le document que le modèle y a reconnu.
  const piecesLibres = pieces.filter((piece) => estPieceLibre(piece.type_document));
  const manquantes = attendues
    .filter((piece) => !deposees.has(piece.code))
    .filter((piece) => !typesVus.some((type) => appartientALaFamille(piece.libelle, type)))
    .map((piece) => piece.libelle);

  const maintenant = new Date();

  // Les anomalies sont aussi rangées pièce par pièce : c'est ce qui permet de
  // confronter ce que le contrôle signale à ce que l'admin a réellement décidé
  // sur la même pièce, et donc de régler les gravités sur des faits.
  // Un fichier servant deux emplacements est une seule histoire : la pièce
  // signalée « ce n'est pas la bonne » est celle qui manque, et le doublon le
  // dit déjà. On le sait ici, où l'on voit toutes les pièces à la fois.
  const enDoublon = new Set(doublonsParFichier(pieces).flat().map((p) => p.document_id));

  // Les deux faces d'une carte d'identité arrivent dans deux emplacements —
  // « doc_2 » et « doc_2_verso » — donc en deux pièces pour le contrôle, alors
  // que c'est un seul titre. Sur DEM-2026-08238, le recto donnait 09/02/2035 et
  // le verso avait été mal lu 10/02/2025 : le contrôle avait la bonne date sous
  // les yeux et signalait l'autre. Une validité encore en cours sur une face
  // vaut pour tout le document.
  const racine = (type: string) => type.replace(/_(recto|verso)$/i, "");
  const encoreValide = new Set(
    pieces
      .filter((p) => {
        const fin = p.extraction?.dates?.validite;
        return !!fin && new Date(fin).getTime() > maintenant.getTime();
      })
      .map((p) => racine(p.type_document)),
  );
  for (const piece of pieces) {
    piece.validiteAilleurs = encoreValide.has(racine(piece.type_document));
  }
  const parPiece = pieces.map((piece) => ({
    piece,
    anomalies: anomaliesPiece(piece, contexte, maintenant, enDoublon.has(piece.document_id)),
  }));
  // Les intitulés de la configuration guident un dépôt ; devant un constat ils
  // encombrent. L'interface affiche ce nom avant le message : on l'abrège, en
  // gardant la face, car « la CG » et « la CG (verso) » ne désignent pas le même
  // emplacement.

  for (const { piece, anomalies } of parPiece) {
    await supabase.from("analyses_documents").update({ anomalies }).eq("document_id", piece.document_id);
  }

  const anomalies: Anomalie[] = [
    // La plaque est jugée au niveau du dossier, en une seule phrase qui compte
    // les pièces d'accord. Chaque pièce garde la sienne dans analyses_documents,
    // où elle sert à confronter le contrôle aux décisions de l'administration.
    ...parPiece.flatMap((p) => p.anomalies.filter((a) => a.code !== "plaque_differente")),
    ...anomaliesDossier(pieces, manquantes, contexte, demarche.documents_complets === true, attendues.map((p) => p.libelle), maintenant),
  ];

  // Les intitulés de la configuration guident un dépôt ; devant un constat ils
  // encombrent. L'interface affiche ce nom avant le message : on l'abrège, en
  // gardant la face, car « la CG » et « la CG (verso) » ne désignent pas le même
  // emplacement. Fait ici pour que les constats du dossier en profitent aussi.
  for (const anomalie of anomalies) {
    if (anomalie.piece) anomalie.piece = libelleCourt(anomalie.piece);
  }

  const analysees = pieces.filter((piece) => piece.extraction).length;

  // « En attente » seulement tant qu'aucune pièce n'a été lue. Dès qu'une l'a
  // été, on affiche ce qu'on sait : une relecture de tout un dossier prend
  // plusieurs passages, et faire disparaître un verdict déjà rendu pendant ce
  // temps donne l'impression que le contrôle ne fonctionne plus.
  await supabase.from("controles_demarche").upsert({
    demarche_id: demarcheId,
    niveau: analysees === 0 ? "en_attente" : niveauDossier(anomalies),
    anomalies,
    pieces_analysees: analysees,
    pieces_attendues: pieces.length,
    calcule_le: maintenant.toISOString(),
  });
}
