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
  niveauDossier,
  type Anomalie,
  type ContexteDossier,
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
  const condensat = await crypto.subtle.digest("SHA-256", octets);
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
    .select("id, document_id, demarche_id, tentatives, documents!inner(type_document, document_type, nom_fichier, url, taille_octets)")
    .eq("statut", "en_attente")
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
  supabase: ReturnType<typeof createClient>,
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
    (pieces ?? []).forEach((piece, index) => {
      libelles[`doc_${index + 1}`] = piece.nom_document;
    });
  }
  cacheLibelles.set(typeDemarche, libelles);
  return libelles;
}

async function pieceObligatoires(
  supabase: ReturnType<typeof createClient>,
  typeDemarche: string,
): Promise<{ code: string; libelle: string }[]> {
  const { data: action } = await supabase.from("actions_rapides").select("id").eq("code", typeDemarche).maybeSingle();
  if (!action?.id) return [];
  const { data: pieces } = await supabase
    .from("action_documents")
    .select("nom_document, ordre, obligatoire")
    .eq("action_id", action.id)
    .order("ordre");
  return (pieces ?? [])
    .map((piece, index) => ({ code: `doc_${index + 1}`, libelle: piece.nom_document, obligatoire: piece.obligatoire }))
    .filter((piece) => piece.obligatoire)
    .map(({ code, libelle }) => ({ code, libelle }));
}

async function contexteDeLecture(
  supabase: ReturnType<typeof createClient>,
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
    typeDemarche: typeDemarche || "démarche d'immatriculation",
    immatriculation: demarche?.immatriculation ?? null,
    vin,
    vehicule: [demarche?.marque, demarche?.modele].filter(Boolean).join(" ") || null,
    titulaire: [demarche?.client_prenom, demarche?.client_nom].filter(Boolean).join(" ") || null,
  };
}

async function recontroler(supabase: ReturnType<typeof createClient>, demarcheId: string) {
  const { data: demarche } = await supabase
    .from("demarches")
    .select("type, immatriculation, marque, modele, client_nom, client_prenom, client_adresse, mandat_data, documents_complets, vehicule_id")
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

  const { data: documents } = await supabase
    .from("documents")
    .select("id, type_document, document_type, nom_fichier, taille_octets, created_at")
    .eq("demarche_id", demarcheId)
    .order("created_at", { ascending: true });

  // Une pièce refusée puis renvoyée existe en double : seule la dernière version
  // de chaque emplacement est contrôlée.
  type Depot = {
    id: string; type_document: string; document_type: string | null;
    nom_fichier: string; taille_octets: number | null; created_at: string;
  };
  const derniere = new Map<string, Depot>();
  for (const doc of (documents ?? []) as Depot[]) {
    if (doc.type_document?.startsWith("admin_")) continue;
    derniere.set(doc.type_document, doc);
  }
  const retenus = [...derniere.values()];

  const { data: analyses } = await supabase
    .from("analyses_documents")
    .select("document_id, statut, extraction, empreinte")
    .in("document_id", retenus.map((doc) => doc.id).slice(0, 200));
  const parDocument = new Map((analyses ?? []).map((a) => [a.document_id, a]));

  const libelles = await libellesDocN(supabase, demarche.type);
  const pieces: Piece[] = retenus.map((doc) => {
    const analyse = parDocument.get(doc.id);
    return {
      document_id: doc.id,
      type_document: doc.type_document,
      libelle: libellePiece(doc.type_document, libelles, doc.document_type),
      nom_fichier: doc.nom_fichier,
      taille_octets: doc.taille_octets,
      empreinte: analyse?.empreinte ?? null,
      extraction: analyse?.statut === "ok" ? analyse.extraction : null,
    };
  });

  let vin: string | null = null;
  if (demarche.vehicule_id) {
    const { data: vehicule } = await supabase.from("vehicules").select("vin").eq("id", demarche.vehicule_id).maybeSingle();
    vin = vehicule?.vin ?? null;
  }

  const contexte: ContexteDossier = {
    type: demarche.type,
    immatriculation: demarche.immatriculation,
    vin,
    client_nom: demarche.client_nom,
    client_prenom: demarche.client_prenom,
    client_adresse: demarche.client_adresse,
    mandat_data: demarche.mandat_data,
  };

  const deposees = new Set(retenus.map((doc) => doc.type_document));
  const attendues = await pieceObligatoires(supabase, demarche.type);
  const manquantes = attendues.filter((piece) => !deposees.has(piece.code)).map((piece) => piece.libelle);

  const maintenant = new Date();
  const anomalies: Anomalie[] = [
    ...pieces.flatMap((piece) => anomaliesPiece(piece, contexte, maintenant)),
    ...anomaliesDossier(pieces, manquantes, contexte, demarche.documents_complets === true),
  ];

  const analysees = pieces.filter((piece) => piece.extraction).length;
  const enAttente = pieces.length > analysees;

  await supabase.from("controles_demarche").upsert({
    demarche_id: demarcheId,
    niveau: enAttente && anomalies.length === 0 ? "en_attente" : niveauDossier(anomalies),
    anomalies,
    pieces_analysees: analysees,
    pieces_attendues: pieces.length,
    calcule_le: maintenant.toISOString(),
  });
}
