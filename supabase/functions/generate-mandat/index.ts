import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Le Cerfa vierge est déjà servi par le site (public/cerfas). On le récupère là
// plutôt que de l'embarquer dans la fonction : 574 Ko de base64 alourdiraient
// chaque démarrage à froid.
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://discountcartegrise.fr";
const CERFA_URL = `${SITE_URL}/cerfas/cerfa_13757_03.pdf`;

// Zone « Signature / Pour les sociétés, nom et qualité du signataire et cachet ».
// Coordonnées relevées sur le PDF (origine en bas à gauche, page A4 595x842).
const ZONE = { x: 435, y: 70, w: 135, h: 135 };

interface MandatData {
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

interface GenerateMandatRequest {
  demarcheId?: string;
  orderId?: string;
  mandatData: MandatData;
  // Clé sous laquelle le tunnel appelant reconnaît la pièce « mandat » dans sa
  // liste de documents obligatoires. Elle diffère d'un parcours à l'autre
  // (« doc_8 » côté pro, le libellé complet côté particulier), donc c'est
  // l'appelant qui la fournit ; sans elle le mandat serait bien généré mais la
  // pièce resterait marquée manquante.
  documentType?: string;
}

// Identité du mandataire : c'est nous, toujours. Reprise des mentions légales.
const MANDATAIRE_IDENTITE = "DISCOUNT AUTO / PAREBRISE";
const MANDATAIRE_SIRET = "83088827700027";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Les champs du Cerfa portent des noms complets du type
// « topmostSubform[0].Page1[0].txt_IdentitéMandant[0] ». On les indexe par leur
// suffixe court pour ne pas dépendre de la structure XFA, que pdf-lib retire.
function indexFields(form: ReturnType<PDFDocument["getForm"]>) {
  const map = new Map<string, ReturnType<typeof form.getFields>[number]>();
  for (const field of form.getFields()) {
    const name = field.getName();
    const short = name.slice(name.lastIndexOf(".") + 1).replace(/\[0\]$/, "");
    map.set(short, field);
  }
  return map;
}

async function downloadImage(
  supabase: ReturnType<typeof createClient>,
  path: string | undefined,
): Promise<Uint8Array | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("signatures").download(path);
  if (error || !data) {
    console.error("Lecture de l'image échouée:", path, error?.message);
    return null;
  }
  return new Uint8Array(await data.arrayBuffer());
}

// Le pad produit du PNG, mais un client peut importer un JPEG. On tranche sur
// les octets d'en-tête plutôt que sur le content-type déclaré, qui ment parfois.
async function embedImage(pdfDoc: PDFDocument, bytes: Uint8Array) {
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  return isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { demarcheId, orderId, mandatData, documentType } = (await req.json()) as GenerateMandatRequest;
    const typeDocument = documentType?.trim() || "mandat_13757";

    if (!mandatData) return jsonResponse({ error: "mandatData est requis" }, 400);
    if (!demarcheId && !orderId) return jsonResponse({ error: "demarcheId ou orderId est requis" }, 400);
    if (demarcheId && !UUID_REGEX.test(demarcheId)) return jsonResponse({ error: "demarcheId invalide" }, 400);
    if (orderId && !UUID_REGEX.test(orderId)) return jsonResponse({ error: "orderId invalide" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // --- 1. Cerfa vierge ---------------------------------------------------
    const cerfaResponse = await fetch(CERFA_URL);
    if (!cerfaResponse.ok) {
      throw new Error(`Cerfa introuvable (${cerfaResponse.status}) à ${CERFA_URL}`);
    }
    const pdfDoc = await PDFDocument.load(await cerfaResponse.arrayBuffer());
    const form = pdfDoc.getForm();
    const fields = indexFields(form);

    const setText = (short: string, value: string | undefined | null) => {
      if (!value) return;
      const field = fields.get(short);
      if (!field) {
        console.warn("Champ absent du Cerfa:", short);
        return;
      }
      try {
        // @ts-expect-error : setText n'existe que sur les champs texte, et on
        // n'appelle cette fonction que sur ceux-là.
        field.setText(value);
      } catch (e) {
        console.warn("Écriture impossible sur", short, e instanceof Error ? e.message : e);
      }
    };

    const now = new Date();
    setText("txt_IdentitéMandant", mandatData.mandant_identite);
    setText("num_SIRETMandant", mandatData.mandant_siret);
    setText("num_VoieAdresse", mandatData.adresse_numero);
    setText("txt_ExtensionAdresse", mandatData.adresse_extension);
    setText("txt_TypeVoieAdresse", mandatData.adresse_type_voie);
    setText("txt_NomVoieAdresse", mandatData.adresse_nom_voie);
    setText("num_CodePostalAdresse", mandatData.adresse_code_postal);
    setText("txt_CommuneAdresse", mandatData.adresse_commune);
    setText("txt_PaysAdresse", mandatData.adresse_pays ?? "FRANCE");
    setText("txt_IdentitéMandataire", MANDATAIRE_IDENTITE);
    setText("num_SIRETMandataire", MANDATAIRE_SIRET);
    setText("txt_NatureOpération", mandatData.nature_operation);
    setText("txt_MarqueVéhicule", mandatData.vehicule_marque);
    setText("txt_NumVinVéhicule", mandatData.vehicule_vin);
    setText("txt_MarqueImmatriculation", mandatData.vehicule_immatriculation);
    setText("txt_LieuDéclaration", mandatData.lieu_declaration);
    setText("num_DateJourDéclaration", String(now.getDate()).padStart(2, "0"));
    setText("num_DateMoisDéclaration", String(now.getMonth() + 1).padStart(2, "0"));
    setText("num_DateAnnéeDéclaration", String(now.getFullYear()));

    // Les deux cases du Cerfa portent des noms INVERSÉS par rapport à leur sens
    // (vérifié en les cochant une par une) : ckb_ConfirmationInformation coche
    // l'opposition à la prospection, et ckb_OppositionUtilisationDonnées coche
    // l'obligation d'assurance. Aucune n'est cochée d'office : ce sont des
    // déclarations du client, pas des valeurs par défaut.

    // --- 2. Signature, tampon, nom et qualité ------------------------------
    const page = pdfDoc.getPage(0);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const signatureBytes = await downloadImage(supabase, mandatData.signature_path);
    const tamponBytes = await downloadImage(supabase, mandatData.tampon_path);

    let cursorY = ZONE.y + ZONE.h - 22;

    if (mandatData.signataire_nom_qualite) {
      page.drawText(mandatData.signataire_nom_qualite, {
        x: ZONE.x + 3,
        y: cursorY,
        size: 6.5,
        font,
        color: rgb(0, 0, 0),
        maxWidth: ZONE.w - 6,
      });
      cursorY -= 10;
    }

    // Sans tampon la signature occupe toute la hauteur restante ; avec tampon,
    // les deux se partagent la zone.
    const hasTampon = Boolean(tamponBytes);
    const disponible = cursorY - ZONE.y;

    if (signatureBytes) {
      const img = await embedImage(pdfDoc, signatureBytes);
      const h = hasTampon ? Math.min(45, disponible * 0.5) : Math.min(60, disponible);
      const ratio = img.width / img.height;
      const w = Math.min(ZONE.w - 6, h * ratio);
      page.drawImage(img, { x: ZONE.x + 3, y: cursorY - h, width: w, height: h });
      cursorY -= h + 4;
    }

    if (tamponBytes) {
      const img = await embedImage(pdfDoc, tamponBytes);
      const h = Math.min(50, cursorY - ZONE.y);
      const ratio = img.width / img.height;
      const w = Math.min(ZONE.w - 6, h * ratio);
      page.drawImage(img, { x: ZONE.x + 3, y: cursorY - h, width: w, height: h });
    }

    // Aplati : le mandat devient un document figé, plus un formulaire éditable.
    form.flatten();
    const pdfBytes = await pdfDoc.save();

    // --- 3. Dépôt et rattachement au dossier -------------------------------
    const NOM_FICHIER = "Mandat_13757.pdf";
    const bucket = demarcheId ? "demarche-documents" : "guest-order-documents";
    const dossierId = demarcheId ?? orderId!;
    // Chemin stable : une correction ecrase le mandat precedent au lieu d'en
    // laisser un orphelin dans le stockage a chaque regeneration.
    const chemin = `${dossierId}/mandat_13757.pdf`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(chemin, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (uploadError) throw new Error("Dépôt du mandat impossible : " + uploadError.message);

    const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(chemin);
    // Le chemin ne changeant plus, on casse le cache navigateur pour que la
    // version corrigee s'affiche bien au lieu de l'ancienne.
    const urlHorodatee = `${publicUrl.publicUrl}?v=${Date.now()}`;

    // Le rattachement est vérifié : sans lui le mandat existe dans le stockage
    // mais la pièce reste comptée manquante et bloque la suite du dossier.
    // Renvoyer un succès dans ce cas laisserait le client devant une pièce
    // obligatoire qu'il vient pourtant de produire, sans explication.
    if (demarcheId) {
      await supabase.from("documents").delete().eq("demarche_id", demarcheId).eq("type_document", typeDocument);
      const { error } = await supabase.from("documents").insert({
        demarche_id: demarcheId,
        type_document: typeDocument,
        document_type: "Mandat (Cerfa 13757)",
        nom_fichier: NOM_FICHIER,
        url: urlHorodatee,
        taille_octets: pdfBytes.length,
      });
      if (error) throw new Error("Mandat généré mais non rattaché au dossier : " + error.message);
      await supabase.from("demarches").update({ mandat_data: mandatData }).eq("id", demarcheId);
    } else {
      await supabase.from("guest_order_documents").delete().eq("order_id", orderId).eq("type_document", typeDocument);
      const { error } = await supabase.from("guest_order_documents").insert({
        order_id: orderId,
        type_document: typeDocument,
        nom_fichier: NOM_FICHIER,
        url: urlHorodatee,
        taille_octets: pdfBytes.length,
      });
      if (error) throw new Error("Mandat généré mais non rattaché au dossier : " + error.message);
      await supabase.from("guest_orders").update({ mandat_data: mandatData }).eq("id", orderId);
    }

    return jsonResponse({ success: true, path: chemin, url: urlHorodatee, bucket });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("generate-mandat:", message);
    return jsonResponse({ error: message }, 500);
  }
});
