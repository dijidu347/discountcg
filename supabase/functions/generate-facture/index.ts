import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
        demarche_id: demarcheId,
        garage_id: demarche.garage_id,
        montant_ht: demarche.montant_ht || 0,
        montant_ttc: demarche.montant_ttc || 0,
        tva: 20,
      })
      .select()
      .single();

    if (factureError) {
      throw new Error('Failed to create facture: ' + factureError.message);
    }

    console.log('Facture created:', facture);

    // Generate PDF content (simple HTML that can be converted to PDF)
    const pdfContent = generateFactureHTML(facture, demarche, demarche.garages);

    // Store the HTML content temporarily (in a real implementation, you'd use a PDF library)
    // For now, we'll store the HTML and let the frontend handle PDF conversion
    const fileName = `${demarche.garage_id}/${facture.numero}.html`;
    const { error: uploadError } = await supabase.storage
      .from('factures')
      .upload(fileName, pdfContent, {
        contentType: 'text/html',
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

function generateFactureHTML(facture: any, demarche: any, garage: any): string {
  const date = new Date(facture.created_at).toLocaleDateString('fr-FR');
  
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Facture ${facture.numero}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .company { font-weight: bold; font-size: 18px; }
    .invoice-number { font-size: 24px; font-weight: bold; color: #333; }
    .section { margin: 20px 0; }
    .section-title { font-weight: bold; font-size: 14px; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f5f5f5; font-weight: bold; }
    .total-row { font-weight: bold; font-size: 16px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #333; text-align: center; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company">DiscountCG</div>
      <div>Service de gestion des démarches</div>
    </div>
    <div>
      <div class="invoice-number">FACTURE ${facture.numero}</div>
      <div>Date: ${date}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">FACTURÉ À:</div>
    <div><strong>${garage.raison_sociale}</strong></div>
    <div>${garage.adresse}</div>
    <div>${garage.code_postal} ${garage.ville}</div>
    <div>SIRET: ${garage.siret}</div>
    <div>Email: ${garage.email}</div>
    <div>Tél: ${garage.telephone}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>N° Démarche</th>
        <th>Description</th>
        <th>Immatriculation</th>
        <th>Type</th>
        <th style="text-align: right;">Montant HT</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="font-family: monospace; font-weight: bold;">${demarche.numero_demarche}</td>
        <td>Démarche administrative</td>
        <td>${demarche.immatriculation}</td>
        <td>${demarche.type}</td>
        <td style="text-align: right;">${Number(facture.montant_ht).toFixed(2)} €</td>
      </tr>
    </tbody>
    <tfoot>
      <tr>
        <td colspan="4" style="text-align: right;"><strong>Total HT</strong></td>
        <td style="text-align: right;"><strong>${Number(facture.montant_ht).toFixed(2)} €</strong></td>
      </tr>
      <tr>
        <td colspan="4" style="text-align: right;">TVA (${facture.tva}%)</td>
        <td style="text-align: right;">${(Number(facture.montant_ttc) - Number(facture.montant_ht)).toFixed(2)} €</td>
      </tr>
      <tr class="total-row">
        <td colspan="4" style="text-align: right;">Total TTC</td>
        <td style="text-align: right;">${Number(facture.montant_ttc).toFixed(2)} €</td>
      </tr>
    </tfoot>
  </table>

  <div class="footer">
    <p>Merci de votre confiance</p>
    <p>DiscountCG - Service professionnel de gestion des démarches automobiles</p>
  </div>
</body>
</html>
  `.trim();
}