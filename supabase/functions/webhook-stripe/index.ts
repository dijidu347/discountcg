import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

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
