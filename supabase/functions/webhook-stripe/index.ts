import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

// Fonction pour générer le HTML de la facture pour démarches
function generateDemarcheFactureHTML(facture: any, demarche: any, garage: any): string {
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

// Fonction pour générer le HTML de la facture pour guest orders
function generateGuestOrderFactureHTML(facture: any, order: any): string {
  const date = new Date(facture.created_at).toLocaleDateString('fr-FR');
  const montantHT = Number(facture.montant_ht);
  const montantTTC = Number(facture.montant_ttc);
  const tva = montantTTC - montantHT;
  
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
    <div><strong>${order.prenom} ${order.nom}</strong></div>
    <div>${order.adresse}</div>
    <div>${order.code_postal} ${order.ville}</div>
    <div>Email: ${order.email}</div>
    <div>Tél: ${order.telephone}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>N° Suivi</th>
        <th>Description</th>
        <th>Immatriculation</th>
        <th style="text-align: right;">Montant HT</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="font-family: monospace; font-weight: bold;">${order.tracking_number}</td>
        <td>Démarche carte grise</td>
        <td>${order.immatriculation}</td>
        <td style="text-align: right;">${montantHT.toFixed(2)} €</td>
      </tr>
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3" style="text-align: right;"><strong>Total HT</strong></td>
        <td style="text-align: right;"><strong>${montantHT.toFixed(2)} €</strong></td>
      </tr>
      <tr>
        <td colspan="3" style="text-align: right;">TVA (20%)</td>
        <td style="text-align: right;">${tva.toFixed(2)} €</td>
      </tr>
      <tr class="total-row">
        <td colspan="3" style="text-align: right;">Total TTC</td>
        <td style="text-align: right;">${montantTTC.toFixed(2)} €</td>
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      throw new Error('No signature provided');
    }

    const body = await req.text();

    // For simplicity, we're not verifying the signature in this example
    // In production, you should verify it using Stripe's webhook secret
    const event = JSON.parse(body);

    console.log('Stripe webhook event:', event.type);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const demarcheId = paymentIntent.metadata.demarche_id;
        const garageId = paymentIntent.metadata.garage_id;
        const guestOrderId = paymentIntent.metadata.guest_order_id;

        // Handle guest order payment
        if (guestOrderId) {
          // Update guest order
          await supabaseClient
            .from('guest_orders')
            .update({ 
              paye: true,
              paid_at: new Date().toISOString(),
              status: 'en_traitement',
              payment_intent_id: paymentIntent.id
            })
            .eq('id', guestOrderId);

          // Get order details for email
          const { data: order } = await supabaseClient
            .from('guest_orders')
            .select('*')
            .eq('id', guestOrderId)
            .single();

          if (order) {
            // Générer la facture pour la commande invité
            try {
              // Générer le numéro de facture
              const { data: numeroData, error: numeroError } = await supabaseClient
                .rpc('generate_facture_numero');

              if (!numeroError && numeroData) {
                const numero = numeroData as string;
                
                // Calculer montant HT (montant TTC / 1.20)
                const montantTTC = Number(order.montant_ttc);
                const montantHT = montantTTC / 1.2;

                // Créer l'enregistrement de facture
                const { data: facture, error: factureError } = await supabaseClient
                  .from('factures')
                  .insert({
                    numero,
                    guest_order_id: guestOrderId,
                    montant_ht: montantHT,
                    montant_ttc: montantTTC,
                    tva: 20,
                  })
                  .select()
                  .single();

                if (!factureError && facture) {
                  // Générer le HTML de la facture
                  const htmlContent = generateGuestOrderFactureHTML(facture, order);
                  
                  // Sauvegarder dans le storage
                  const fileName = `guest-orders/${order.tracking_number}/${facture.numero}.html`;
                  const { error: uploadError } = await supabaseClient.storage
                    .from('factures')
                    .upload(fileName, htmlContent, {
                      contentType: 'text/html',
                      upsert: true,
                    });

                  if (!uploadError) {
                    // Récupérer l'URL publique
                    const { data: urlData } = supabaseClient.storage
                      .from('factures')
                      .getPublicUrl(fileName);

                    // Mettre à jour la facture avec l'URL
                    await supabaseClient
                      .from('factures')
                      .update({ pdf_url: urlData.publicUrl })
                      .eq('id', facture.id);

                    console.log('Facture générée pour guest order:', facture.numero);
                  }
                }
              }
            } catch (factureError) {
              console.error('Erreur lors de la génération de la facture guest order:', factureError);
            }

            // Envoyer l'email de confirmation de paiement
            if (order.email_notifications) {
              await supabaseClient.functions.invoke('send-order-emails', {
                body: {
                  type: 'payment_confirmed',
                  email: order.email,
                  customerName: `${order.prenom} ${order.nom}`,
                  immatriculation: order.immatriculation,
                  trackingNumber: order.tracking_number,
                  montantTTC: order.montant_ttc
                }
              });
            }
          }

          console.log('Guest order payment processed:', guestOrderId);
        }
        // Handle regular demarche payment
        else if (demarcheId) {
          // Update payment status
          await supabaseClient
            .from('paiements')
            .update({ 
              status: 'valide',
              validated_at: new Date().toISOString()
            })
            .eq('stripe_payment_id', paymentIntent.id);

          // Update demarche status
          await supabaseClient
            .from('demarches')
            .update({ 
              paye: true,
              status: 'en_attente',
              is_draft: false
            })
            .eq('id', demarcheId);

          // Get demarche details with garage info
          const { data: demarche } = await supabaseClient
            .from('demarches')
            .select(`
              *,
              garages (*)
            `)
            .eq('id', demarcheId)
            .single();

          if (demarche) {
            // Générer la facture pour la démarche
            try {
              // Vérifier si une facture existe déjà
              const { data: existingFacture } = await supabaseClient
                .from('factures')
                .select('*')
                .eq('demarche_id', demarcheId)
                .maybeSingle();

              if (!existingFacture) {
                // Générer le numéro de facture
                const { data: numeroData, error: numeroError } = await supabaseClient
                  .rpc('generate_facture_numero');

                if (!numeroError && numeroData) {
                  const numero = numeroData as string;

                  // Créer l'enregistrement de facture
                  const { data: facture, error: factureError } = await supabaseClient
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

                  if (!factureError && facture) {
                    // Générer le HTML de la facture
                    const htmlContent = generateDemarcheFactureHTML(facture, demarche, demarche.garages);
                    
                    // Sauvegarder dans le storage
                    const fileName = `${demarche.garage_id}/${facture.numero}.html`;
                    const { error: uploadError } = await supabaseClient.storage
                      .from('factures')
                      .upload(fileName, htmlContent, {
                        contentType: 'text/html',
                        upsert: true,
                      });

                    if (!uploadError) {
                      // Récupérer l'URL publique
                      const { data: urlData } = supabaseClient.storage
                        .from('factures')
                        .getPublicUrl(fileName);

                      // Mettre à jour la facture avec l'URL
                      await supabaseClient
                        .from('factures')
                        .update({ pdf_url: urlData.publicUrl })
                        .eq('id', facture.id);

                      // Lier la facture à la démarche
                      await supabaseClient
                        .from('demarches')
                        .update({ facture_id: facture.id })
                        .eq('id', demarcheId);

                      console.log('Facture générée pour démarche:', facture.numero);
                    }
                  }
                }
              }
            } catch (factureError) {
              console.error('Erreur lors de la génération de la facture démarche:', factureError);
            }
          }

          // Create notification
          await supabaseClient
            .from('notifications')
            .insert({
              garage_id: garageId,
              demarche_id: demarcheId,
              type: 'payment_confirmed',
              message: `Votre paiement de ${(paymentIntent.amount / 100).toFixed(2)}€ a été validé. Votre démarche est en cours de traitement.`
            });

          console.log('Payment processed successfully for demarche:', demarcheId);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        
        await supabaseClient
          .from('paiements')
          .update({ status: 'refuse' })
          .eq('stripe_payment_id', paymentIntent.id);

        console.log('Payment failed for payment intent:', paymentIntent.id);
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
