import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateFactureRequest {
  demarcheId: string;
}

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(uuid: string): boolean {
  return UUID_REGEX.test(uuid);
}

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  isTaxable: boolean;
}

async function generateFacturePDF(
  facture: any, 
  demarche: any, 
  garage: any, 
  trackingServices: any[] = [],
  prixCarteGrise: number = 0,
  fraisDossier: number = 0
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  const blue = rgb(0.145, 0.388, 0.922); // #2563eb
  const black = rgb(0, 0, 0);
  const gray = rgb(0.4, 0.4, 0.4);
  const lightGray = rgb(0.95, 0.96, 0.98);
  const green = rgb(0.02, 0.59, 0.41);
  
  const margin = 50;
  let y = height - margin;
  
  // Header
  page.drawText("DiscountCarteGrise", { x: margin, y, size: 24, font: fontBold, color: blue });
  
  const date = new Date(facture.created_at).toLocaleDateString("fr-FR");
  page.drawText(`Facture N° ${facture.numero}`, { x: width - margin - 180, y, size: 16, font: fontBold, color: blue });
  y -= 20;
  page.drawText(`Date : ${date}`, { x: width - margin - 180, y, size: 10, font: fontRegular, color: gray });
  
  // Blue line
  y -= 30;
  page.drawRectangle({ x: margin, y, width: width - 2 * margin, height: 3, color: blue });
  
  // Parties
  y -= 40;
  page.drawText("EMETTEUR", { x: margin, y, size: 10, font: fontBold, color: gray });
  page.drawText("CLIENT", { x: width / 2, y, size: 10, font: fontBold, color: gray });
  
  y -= 20;
  page.drawText("DiscountCarteGrise", { x: margin, y, size: 12, font: fontBold, color: black });
  page.drawText(garage?.raison_sociale || "Client", { x: width / 2, y, size: 12, font: fontBold, color: black });
  
  y -= 15;
  page.drawText("Service de cartes grises", { x: margin, y, size: 10, font: fontRegular, color: gray });
  page.drawText(garage?.adresse || "", { x: width / 2, y, size: 10, font: fontRegular, color: gray });
  
  y -= 12;
  page.drawText("SIRET : 123 456 789 00012", { x: margin, y, size: 10, font: fontRegular, color: gray });
  page.drawText(`${garage?.code_postal || ""} ${garage?.ville || ""}`, { x: width / 2, y, size: 10, font: fontRegular, color: gray });
  
  y -= 12;
  page.drawText("contact@discountcartegrise.fr", { x: margin, y, size: 10, font: fontRegular, color: gray });
  page.drawText(`SIRET : ${garage?.siret || "N/A"}`, { x: width / 2, y, size: 10, font: fontRegular, color: gray });
  
  y -= 12;
  page.drawText(garage?.email || "", { x: width / 2, y, size: 10, font: fontRegular, color: gray });
  
  // Détails box
  y -= 40;
  page.drawRectangle({ x: margin, y: y - 70, width: width - 2 * margin, height: 80, color: lightGray });
  
  y -= 10;
  page.drawText("Details de la demarche", { x: margin + 15, y, size: 12, font: fontBold, color: blue });
  
  y -= 20;
  page.drawText("N Demarche :", { x: margin + 15, y, size: 10, font: fontRegular, color: gray });
  page.drawText(demarche?.numero_demarche || "N/A", { x: margin + 150, y, size: 10, font: fontBold, color: black });
  
  y -= 15;
  page.drawText("Immatriculation :", { x: margin + 15, y, size: 10, font: fontRegular, color: gray });
  page.drawText(demarche?.immatriculation || "N/A", { x: margin + 150, y, size: 10, font: fontBold, color: black });
  
  y -= 15;
  page.drawText("Type :", { x: margin + 15, y, size: 10, font: fontRegular, color: gray });
  page.drawText(demarche?.type || "N/A", { x: margin + 150, y, size: 10, font: fontBold, color: black });
  
  // Build line items
  const lineItems: InvoiceLineItem[] = [];
  
  // Carte grise (NOT taxable)
  if (prixCarteGrise > 0) {
    lineItems.push({
      description: `Taxe carte grise - ${demarche?.immatriculation || "N/A"}`,
      quantity: 1,
      unitPrice: prixCarteGrise,
      isTaxable: false,
    });
  }
  
  // Frais de dossier (taxable)
  if (fraisDossier > 0) {
    lineItems.push({
      description: "Frais de dossier",
      quantity: 1,
      unitPrice: fraisDossier,
      isTaxable: true,
    });
  }
  
  // Tracking services / Options (taxable)
  for (const service of trackingServices) {
    const serviceLabels: Record<string, string> = {
      'priority': 'Dossier prioritaire',
      'non_gage': 'Certificat de non gage',
      'email_tracking': 'Suivi par email',
      'sms_tracking': 'Suivi par SMS',
      'full_tracking': 'Suivi complet',
    };
    lineItems.push({
      description: serviceLabels[service.service_type] || service.service_type,
      quantity: 1,
      unitPrice: Number(service.price),
      isTaxable: true,
    });
  }
  
  // Table header
  y -= 50;
  page.drawRectangle({ x: margin, y: y - 5, width: width - 2 * margin, height: 25, color: blue });
  page.drawText("Description", { x: margin + 10, y: y, size: 10, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText("TVA", { x: width - margin - 200, y: y, size: 10, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText("Prix HT", { x: width - margin - 70, y: y, size: 10, font: fontBold, color: rgb(1, 1, 1) });
  
  // Table rows
  let totalHT = 0;
  let totalTaxable = 0;
  
  for (const item of lineItems) {
    y -= 25;
    page.drawText(item.description, { x: margin + 10, y, size: 10, font: fontRegular, color: black });
    page.drawText(item.isTaxable ? "20%" : "0%", { x: width - margin - 195, y, size: 10, font: fontRegular, color: black });
    page.drawText(`${item.unitPrice.toFixed(2)} EUR`, { x: width - margin - 70, y, size: 10, font: fontRegular, color: black });
    
    totalHT += item.unitPrice;
    if (item.isTaxable) {
      totalTaxable += item.unitPrice;
    }
    
    // Line separator
    y -= 8;
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.9, 0.9, 0.9) });
  }
  
  // Calculate TVA only on taxable items
  const montantTVA = totalTaxable * 0.20;
  const montantTTC = totalHT + montantTVA;
  
  // Totals
  y -= 30;
  page.drawText("Total HT", { x: width - margin - 180, y, size: 10, font: fontRegular, color: black });
  page.drawText(`${totalHT.toFixed(2)} EUR`, { x: width - margin - 70, y, size: 10, font: fontRegular, color: black });
  
  y -= 18;
  page.drawText(`TVA 20% (sur ${totalTaxable.toFixed(2)} EUR)`, { x: width - margin - 180, y, size: 10, font: fontRegular, color: black });
  page.drawText(`${montantTVA.toFixed(2)} EUR`, { x: width - margin - 70, y, size: 10, font: fontRegular, color: black });
  
  y -= 5;
  page.drawLine({ start: { x: width - margin - 200, y }, end: { x: width - margin, y }, thickness: 2, color: blue });
  
  y -= 20;
  page.drawText("Total TTC", { x: width - margin - 180, y, size: 14, font: fontBold, color: blue });
  page.drawText(`${montantTTC.toFixed(2)} EUR`, { x: width - margin - 70, y, size: 14, font: fontBold, color: blue });
  
  // Payment info
  y -= 50;
  page.drawRectangle({ x: margin, y: y - 25, width: width - 2 * margin, height: 40, color: rgb(0.93, 0.99, 0.96) });
  y -= 5;
  page.drawText("Paiement recu", { x: margin + 15, y, size: 11, font: fontBold, color: green });
  y -= 15;
  page.drawText("Paiement effectue par carte bancaire via Stripe", { x: margin + 15, y, size: 9, font: fontRegular, color: gray });
  
  // Note about TVA
  y -= 30;
  page.drawText("* La TVA s'applique uniquement sur les frais de dossier et options, pas sur la taxe carte grise.", { x: margin, y, size: 8, font: fontRegular, color: gray });
  
  // Footer
  y = margin + 40;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.9, 0.9, 0.9) });
  y -= 15;
  page.drawText("DiscountCarteGrise - Service agree de cartes grises", { x: width / 2 - 120, y, size: 9, font: fontRegular, color: gray });
  y -= 12;
  page.drawText("Cette facture a ete generee automatiquement et est valable sans signature.", { x: width / 2 - 160, y, size: 8, font: fontRegular, color: gray });
  
  return await pdfDoc.save();
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('User authenticated:', user.id);

    // Check if user is admin
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roles || roles.role !== 'admin') {
      console.log('User is not admin');
      throw new Error('Only admins can generate invoices');
    }

    console.log('Admin access confirmed');

    const { demarcheId }: GenerateFactureRequest = await req.json();

    // Validate demarcheId format
    if (!demarcheId || typeof demarcheId !== 'string' || !isValidUUID(demarcheId)) {
      console.error('Invalid demarcheId format:', demarcheId);
      throw new Error('Invalid demarcheId format - must be a valid UUID');
    }

    console.log('Generating facture for demarche:', demarcheId);

    // Get demarche details with garage info
    const { data: demarche, error: demarcheError } = await supabase
      .from('demarches')
      .select(`
        *,
        garages (*)
      `)
      .eq('id', demarcheId)
      .single();

    if (demarcheError || !demarche) {
      throw new Error('Demarche not found');
    }

    // Check if facture already exists
    const { data: existingFacture } = await supabase
      .from('factures')
      .select('*')
      .eq('demarche_id', demarcheId)
      .maybeSingle();

    if (existingFacture) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          facture: existingFacture,
          message: 'Facture already exists'
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fetch tracking services for the demarche
    const { data: trackingServices } = await supabase
      .from('tracking_services')
      .select('*')
      .eq('demarche_id', demarcheId);

    // Calculate prices with proper TVA separation
    // Prix carte grise = montant_ttc - frais_dossier - options (no TVA on carte grise)
    const fraisDossier = Number(demarche.frais_dossier) || 0;
    const optionsTotal = (trackingServices || []).reduce((sum: number, s: any) => sum + Number(s.price), 0);
    const montantTotal = Number(demarche.montant_ttc) || 0;
    
    // Prix carte grise (taxe régionale + frais acheminement) - NOT taxable
    const prixCarteGrise = montantTotal - fraisDossier - optionsTotal;
    
    // TVA only on frais dossier + options
    const taxableAmount = fraisDossier + optionsTotal;
    const tvaAmount = taxableAmount * 0.20;
    
    // Total HT = prix carte grise + frais dossier + options (before TVA on taxable)
    const totalHT = prixCarteGrise + taxableAmount;
    // Total TTC = HT + TVA on taxable items only
    const totalTTC = totalHT + tvaAmount;

    console.log('Invoice calculation:', {
      prixCarteGrise,
      fraisDossier,
      optionsTotal,
      taxableAmount,
      tvaAmount,
      totalHT,
      totalTTC
    });

    // Generate facture number
    const { data: numeroData, error: numeroError } = await supabase
      .rpc('generate_facture_numero');

    if (numeroError) {
      throw new Error('Failed to generate facture number: ' + numeroError.message);
    }

    const numero = numeroData as string;

    // Create facture record with correct TVA calculation
    const { data: facture, error: factureError } = await supabase
      .from('factures')
      .insert({
        numero,
        demarche_id: demarcheId,
        garage_id: demarche.garage_id,
        montant_ht: totalHT,
        montant_ttc: totalTTC,
        tva: 20,
      })
      .select()
      .single();

    if (factureError) {
      throw new Error('Failed to create facture: ' + factureError.message);
    }

    console.log('Facture created:', facture);

    // Generate PDF with detailed line items
    const pdfBytes = await generateFacturePDF(
      facture, 
      demarche, 
      demarche.garages, 
      trackingServices || [],
      prixCarteGrise,
      fraisDossier
    );

    // Store the PDF
    const fileName = `${demarche.garage_id}/${facture.numero}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('factures')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      throw new Error('Failed to upload facture: ' + uploadError.message);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('factures')
      .getPublicUrl(fileName);

    // Update facture with PDF URL
    const { error: updateError } = await supabase
      .from('factures')
      .update({ pdf_url: urlData.publicUrl })
      .eq('id', facture.id);

    if (updateError) {
      console.error('Failed to update facture URL:', updateError);
    }

    // Update demarche with facture_id
    await supabase
      .from('demarches')
      .update({ facture_id: facture.id })
      .eq('id', demarcheId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        facture: { ...facture, pdf_url: urlData.publicUrl }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error generating facture:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
