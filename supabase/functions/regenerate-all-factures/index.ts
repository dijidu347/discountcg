import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function generateFacturePDF(
  facture: any, 
  demarche: any, 
  garage: any, 
  trackingServices: any[] = [],
  prixCarteGrise: number = 0,
  fraisDossier: number = 0,
  actionTitre: string = "Frais de dossier"
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
  
  // Header - DISCOUNT AUTO PARE BRISE
  page.drawText("DISCOUNT AUTO PARE BRISE", { x: margin, y, size: 20, font: fontBold, color: blue });
  
  const date = new Date(facture.created_at).toLocaleDateString("fr-FR");
  page.drawText(`Facture N° ${facture.numero}`, { x: width - margin - 180, y, size: 16, font: fontBold, color: blue });
  y -= 20;
  page.drawText(`Date : ${date}`, { x: width - margin - 180, y, size: 10, font: fontRegular, color: gray });
  
  y -= 30;
  page.drawRectangle({ x: margin, y, width: width - 2 * margin, height: 3, color: blue });
  
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
  
  if (prixCarteGrise > 0) {
    y -= 40;
    page.drawText("CARTE GRISE", { x: margin, y, size: 11, font: fontBold, color: blue });
    
    y -= 25;
    page.drawRectangle({ x: margin, y: y - 5, width: width - 2 * margin, height: 25, color: blue });
    page.drawText("Description", { x: margin + 10, y: y, size: 10, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText("Montant", { x: width - margin - 70, y: y, size: 10, font: fontBold, color: rgb(1, 1, 1) });
    
    y -= 25;
    page.drawText("Taxe regionale", { x: margin + 10, y, size: 10, font: fontRegular, color: black });
    page.drawText(`${prixCarteGrise.toFixed(2)} EUR`, { x: width - margin - 70, y, size: 10, font: fontRegular, color: black });
    
    y -= 8;
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.9, 0.9, 0.9) });
  }
  
  const hasServices = fraisDossier > 0 || trackingServices.length > 0;
  
  if (hasServices) {
    y -= 40;
    page.drawText("SERVICES", { x: margin, y, size: 11, font: fontBold, color: blue });
    
    y -= 25;
    page.drawRectangle({ x: margin, y: y - 5, width: width - 2 * margin, height: 25, color: blue });
    page.drawText("Description", { x: margin + 10, y: y, size: 10, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText("Prix", { x: width - margin - 70, y: y, size: 10, font: fontBold, color: rgb(1, 1, 1) });
    
    if (fraisDossier > 0) {
      y -= 25;
      page.drawText(actionTitre, { x: margin + 10, y, size: 10, font: fontRegular, color: black });
      page.drawText(`${fraisDossier.toFixed(2)} EUR`, { x: width - margin - 70, y, size: 10, font: fontRegular, color: black });
      
      y -= 8;
      page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.9, 0.9, 0.9) });
    }
    
    for (const service of trackingServices) {
      const serviceLabels: Record<string, string> = {
        'priority': 'Dossier prioritaire',
        'non_gage': 'Certificat de non gage',
        'email': 'Suivi par email',
        'sms': 'Suivi par SMS',
        'complete': 'Suivi complet',
        'dossier_prioritaire': 'Dossier prioritaire',
        'certificat_non_gage': 'Certificat de non gage',
        'suivi_email': 'Suivi par email',
        'suivi_sms': 'Suivi par SMS',
        'suivi_complet': 'Suivi complet',
      };
      
      y -= 25;
      page.drawText(serviceLabels[service.service_type] || service.service_type, { x: margin + 10, y, size: 10, font: fontRegular, color: black });
      page.drawText(`${Number(service.price).toFixed(2)} EUR`, { x: width - margin - 70, y, size: 10, font: fontRegular, color: black });
      
      y -= 8;
      page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.9, 0.9, 0.9) });
    }
  }
  
  const totalServices = fraisDossier + trackingServices.reduce((sum, s) => sum + Number(s.price), 0);
  const montantTotal = prixCarteGrise + totalServices;
  
  y -= 40;
  page.drawRectangle({ x: width - margin - 220, y: y - 55, width: 220, height: 70, color: lightGray });
  
  y -= 10;
  if (prixCarteGrise > 0) {
    page.drawText("Carte grise", { x: width - margin - 210, y, size: 10, font: fontRegular, color: gray });
    page.drawText(`${prixCarteGrise.toFixed(2)} EUR`, { x: width - margin - 70, y, size: 10, font: fontRegular, color: black });
    y -= 15;
  }
  
  page.drawText("Total services", { x: width - margin - 210, y, size: 10, font: fontRegular, color: black });
  page.drawText(`${totalServices.toFixed(2)} EUR`, { x: width - margin - 70, y, size: 10, font: fontRegular, color: black });
  
  y -= 5;
  page.drawLine({ start: { x: width - margin - 210, y }, end: { x: width - margin, y }, thickness: 2, color: blue });
  
  y -= 20;
  page.drawText("TOTAL", { x: width - margin - 210, y, size: 14, font: fontBold, color: blue });
  page.drawText(`${montantTotal.toFixed(2)} EUR`, { x: width - margin - 70, y, size: 14, font: fontBold, color: blue });
  
  y -= 50;
  page.drawRectangle({ x: margin, y: y - 25, width: width - 2 * margin, height: 40, color: rgb(0.93, 0.99, 0.96) });
  y -= 5;
  page.drawText("Paiement recu", { x: margin + 15, y, size: 11, font: fontBold, color: green });
  y -= 15;
  page.drawText("Paiement effectue par carte bancaire via Stripe", { x: margin + 15, y, size: 9, font: fontRegular, color: gray });
  
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
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const token = authHeader.replace('Bearer ', '').trim();

    // Dual auth: service role key (cron) OR user JWT with admin role
    let authorized = false;
    if (token === supabaseServiceKey) {
      authorized = true;
      console.log('Authorized via service role key (cron)');
    } else {
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (!userError && user) {
        const { data: adminRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();
        if (adminRole) {
          authorized = true;
          console.log('Authorized as admin user:', user.id);
        }
      }
    }

    if (!authorized) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse body params
    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }
    const mode: 'missing' | 'all' = body.mode === 'all' ? 'all' : 'missing';
    const rawLimit = Number(body.limit);
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(200, Math.floor(rawLimit))) : 50;
    const beforeCreatedAt: string | null = typeof body.beforeCreatedAt === 'string' ? body.beforeCreatedAt : null;

    console.log(`Mode=${mode}, limit=${limit}, beforeCreatedAt=${beforeCreatedAt}`);

    let query = supabase
      .from('factures')
      .select('*')
      .not('demarche_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (mode === 'missing') {
      query = query.is('pdf_url', null);
    } else if (beforeCreatedAt) {
      query = query.lt('created_at', beforeCreatedAt);
    }

    const { data: factures, error: facturesError } = await query;

    if (facturesError) {
      throw new Error('Failed to fetch factures: ' + facturesError.message);
    }

    console.log(`Found ${factures?.length || 0} factures to process`);

    let regenerated = 0;
    let failed = 0;
    const errors: string[] = [];
    let lastCreatedAt: string | null = null;

    for (const facture of factures || []) {
      lastCreatedAt = facture.created_at;
      try {
        const { data: demarche, error: demarcheError } = await supabase
          .from('demarches')
          .select('*')
          .eq('id', facture.demarche_id)
          .single();

        if (demarcheError || !demarche) {
          failed++;
          if (errors.length < 20) errors.push(`Facture ${facture.numero}: Demarche not found`);
          continue;
        }

        const { data: garage } = await supabase
          .from('garages')
          .select('*')
          .eq('id', demarche.garage_id)
          .single();

        const { data: trackingServices } = await supabase
          .from('tracking_services')
          .select('*')
          .eq('demarche_id', demarche.id);

        const { data: actionRapide } = await supabase
          .from('actions_rapides')
          .select('prix, titre')
          .eq('code', demarche.type)
          .single();

        const actionTitre = actionRapide?.titre || demarche.type;
        const isCG = demarche.type === 'CG' || demarche.type === 'CG_DA' || demarche.type === 'CG_IMPORT';
        const prixCarteGrise = isCG ? (Number(demarche.prix_carte_grise) || 0) : 0;
        const fraisDossierHT = Number(demarche.frais_dossier) || Number(actionRapide?.prix) || 0;

        const pdfBytes = await generateFacturePDF(
          facture,
          demarche,
          garage,
          trackingServices || [],
          prixCarteGrise,
          fraisDossierHT,
          actionTitre
        );

        const fileName = `${demarche.garage_id}/${facture.numero}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from('factures')
          .upload(fileName, pdfBytes, {
            contentType: 'application/pdf',
            upsert: true,
          });

        if (uploadError) {
          failed++;
          if (errors.length < 20) errors.push(`Facture ${facture.numero}: Upload failed - ${uploadError.message}`);
          continue;
        }

        await supabase
          .from('factures')
          .update({ pdf_url: fileName })
          .eq('id', facture.id);

        regenerated++;
      } catch (err: any) {
        failed++;
        if (errors.length < 20) errors.push(`Facture ${facture.numero}: ${err.message}`);
      }
    }

    const processed = factures?.length || 0;
    const hasMore = processed === limit;
    const nextCursor = hasMore ? lastCreatedAt : null;

    console.log(`Done: processed=${processed}, regenerated=${regenerated}, failed=${failed}, hasMore=${hasMore}`);

    return new Response(
      JSON.stringify({
        success: true,
        mode,
        processed,
        regenerated,
        failed,
        hasMore,
        nextCursor,
        errors,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error regenerating all factures:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  }
});
