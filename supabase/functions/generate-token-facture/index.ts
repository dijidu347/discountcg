import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateTokenFactureRequest {
  tokenPurchaseId: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(uuid: string): boolean {
  return UUID_REGEX.test(uuid);
}

async function generateTokenFacturePDF(
  facture: any,
  purchase: any,
  garage: any
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const blue = rgb(0.145, 0.388, 0.922);
  const black = rgb(0, 0, 0);
  const gray = rgb(0.4, 0.4, 0.4);
  const lightGray = rgb(0.95, 0.96, 0.98);
  const green = rgb(0.02, 0.59, 0.41);

  const margin = 50;
  let y = height - margin;

  // Header
  page.drawText("DISCOUNT AUTO PARE BRISE", { x: margin, y, size: 20, font: fontBold, color: blue });

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
  page.drawText("DISCOUNT DRIVER", { x: margin, y, size: 12, font: fontBold, color: black });
  page.drawText(garage?.raison_sociale || "Client", { x: width / 2, y, size: 12, font: fontBold, color: black });

  y -= 15;
  page.drawText("SAS - Service de cartes grises en ligne", { x: margin, y, size: 10, font: fontRegular, color: gray });
  page.drawText(garage?.adresse || "", { x: width / 2, y, size: 10, font: fontRegular, color: gray });

  y -= 12;
  page.drawText("SIRET : 820 073 484 00017", { x: margin, y, size: 10, font: fontRegular, color: gray });
  page.drawText(`${garage?.code_postal || ""} ${garage?.ville || ""}`, { x: width / 2, y, size: 10, font: fontRegular, color: gray });

  y -= 12;
  page.drawText("24 RUE DU CROUZET, 34770 GIGEAN", { x: margin, y, size: 10, font: fontRegular, color: gray });
  page.drawText(`SIRET : ${garage?.siret || "N/A"}`, { x: width / 2, y, size: 10, font: fontRegular, color: gray });

  y -= 12;
  page.drawText("contact@discountcartegrise.fr", { x: margin, y, size: 10, font: fontRegular, color: gray });

  y -= 12;
  page.drawText(garage?.email || "", { x: width / 2, y, size: 10, font: fontRegular, color: gray });

  // Détails box
  y -= 40;
  page.drawRectangle({ x: margin, y: y - 50, width: width - 2 * margin, height: 60, color: lightGray });

  y -= 10;
  page.drawText("Details de l'achat", { x: margin + 15, y, size: 12, font: fontBold, color: blue });

  y -= 20;
  page.drawText("Type :", { x: margin + 15, y, size: 10, font: fontRegular, color: gray });
  page.drawText("Achat de credits", { x: margin + 150, y, size: 10, font: fontBold, color: black });

  y -= 15;
  const purchaseDate = new Date(purchase.created_at).toLocaleDateString("fr-FR");
  page.drawText("Date d'achat :", { x: margin + 15, y, size: 10, font: fontRegular, color: gray });
  page.drawText(purchaseDate, { x: margin + 150, y, size: 10, font: fontBold, color: black });

  // Section Services
  y -= 50;
  page.drawText("ACHAT DE CREDITS", { x: margin, y, size: 11, font: fontBold, color: blue });

  y -= 25;
  page.drawRectangle({ x: margin, y: y - 5, width: width - 2 * margin, height: 25, color: blue });
  page.drawText("Description", { x: margin + 10, y: y, size: 10, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText("Quantite", { x: width / 2, y: y, size: 10, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText("Prix", { x: width - margin - 70, y: y, size: 10, font: fontBold, color: rgb(1, 1, 1) });

  y -= 25;
  page.drawText("Pack de credits", { x: margin + 10, y, size: 10, font: fontRegular, color: black });
  page.drawText(`${purchase.quantity} EUR de credit`, { x: width / 2, y, size: 10, font: fontRegular, color: black });
  page.drawText(`${Number(purchase.amount).toFixed(2)} EUR`, { x: width - margin - 70, y, size: 10, font: fontRegular, color: black });

  y -= 8;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.9, 0.9, 0.9) });

  // Bonus line
  const bonus = purchase.quantity - purchase.amount;
  if (bonus > 0) {
    y -= 20;
    page.drawText("Bonus offert", { x: margin + 10, y, size: 10, font: fontRegular, color: green });
    page.drawText(`+${bonus} EUR`, { x: width / 2, y, size: 10, font: fontRegular, color: green });
    page.drawText("Offert", { x: width - margin - 70, y, size: 10, font: fontRegular, color: green });
  }

  // Totaux
  y -= 50;
  page.drawRectangle({ x: width - margin - 220, y: y - 40, width: 220, height: 55, color: lightGray });

  y -= 10;
  page.drawText("Montant paye", { x: width - margin - 210, y, size: 10, font: fontRegular, color: black });
  page.drawText(`${Number(purchase.amount).toFixed(2)} EUR`, { x: width - margin - 70, y, size: 10, font: fontRegular, color: black });

  y -= 5;
  page.drawLine({ start: { x: width - margin - 210, y }, end: { x: width - margin, y }, thickness: 2, color: blue });

  y -= 20;
  page.drawText("TOTAL", { x: width - margin - 210, y, size: 14, font: fontBold, color: blue });
  page.drawText(`${Number(purchase.amount).toFixed(2)} EUR`, { x: width - margin - 70, y, size: 14, font: fontBold, color: blue });

  // Payment info
  y -= 50;
  page.drawRectangle({ x: margin, y: y - 25, width: width - 2 * margin, height: 40, color: rgb(0.93, 0.99, 0.96) });
  y -= 5;
  page.drawText("Paiement recu", { x: margin + 15, y, size: 11, font: fontBold, color: green });
  y -= 15;
  page.drawText("Paiement effectue par carte bancaire via Stripe", { x: margin + 15, y, size: 9, font: fontRegular, color: gray });

  // Footer
  y = margin + 40;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.9, 0.9, 0.9) });
  y -= 15;
  page.drawText("DISCOUNT AUTO PARE BRISE - Service agree de cartes grises", { x: width / 2 - 140, y, size: 9, font: fontRegular, color: gray });
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
      throw new Error('Only admins can generate invoices');
    }

    const { tokenPurchaseId }: GenerateTokenFactureRequest = await req.json();

    if (!tokenPurchaseId || !isValidUUID(tokenPurchaseId)) {
      throw new Error('Invalid tokenPurchaseId format');
    }

    console.log('Generating facture for token purchase:', tokenPurchaseId);

    // Get token purchase with garage info
    const { data: purchase, error: purchaseError } = await supabase
      .from('token_purchases')
      .select(`*, garages (*)`)
      .eq('id', tokenPurchaseId)
      .single();

    if (purchaseError || !purchase) {
      throw new Error('Token purchase not found');
    }

    // Check if facture already exists
    const { data: existingFacture } = await supabase
      .from('factures')
      .select('*')
      .eq('token_purchase_id', tokenPurchaseId)
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

    // Generate facture number
    const { data: numeroData, error: numeroError } = await supabase
      .rpc('generate_facture_numero');

    if (numeroError) {
      throw new Error('Failed to generate facture number: ' + numeroError.message);
    }

    const numero = numeroData as string;

    // Create facture record
    const { data: facture, error: factureError } = await supabase
      .from('factures')
      .insert({
        numero,
        token_purchase_id: tokenPurchaseId,
        garage_id: purchase.garage_id,
        montant_ht: purchase.amount,
        montant_ttc: purchase.amount,
        tva: 0,
      })
      .select()
      .single();

    if (factureError) {
      throw new Error('Failed to create facture: ' + factureError.message);
    }

    console.log('Facture created:', facture);

    // Generate PDF
    const pdfBytes = await generateTokenFacturePDF(facture, purchase, purchase.garages);

    // Store the PDF
    const fileName = `${purchase.garage_id}/tokens-${facture.numero}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('factures')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      throw new Error('Failed to upload facture: ' + uploadError.message);
    }

    // Update facture with PDF path
    const { error: updateError } = await supabase
      .from('factures')
      .update({ pdf_url: fileName })
      .eq('id', facture.id);

    if (updateError) {
      console.error('Failed to update facture URL:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        facture: { ...facture, pdf_url: fileName }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error generating token facture:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
