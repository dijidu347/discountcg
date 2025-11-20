import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendCarteGriseRequest {
  orderId: string;
  carteGriseUrl: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, carteGriseUrl }: SendCarteGriseRequest = await req.json();

    console.log('Sending carte grise email for order:', orderId);

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('guest_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    // Fetch carte grise file
    const carteGriseResponse = await fetch(carteGriseUrl);
    const carteGriseBlob = await carteGriseResponse.blob();
    const carteGriseBuffer = await carteGriseBlob.arrayBuffer();
    const carteGriseBase64 = btoa(
      String.fromCharCode(...new Uint8Array(carteGriseBuffer))
    );

    const { data, error } = await resend.emails.send({
      from: 'CarteGrise.com <onboarding@resend.dev>',
      to: order.email,
      subject: `Votre carte grise - Commande ${order.tracking_number}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Votre carte grise est prête !</h1>
          <p>Bonjour ${order.prenom} ${order.nom},</p>
          <p>Nous avons le plaisir de vous informer que votre carte grise pour le véhicule <strong>${order.immatriculation}</strong> est prête.</p>
          <p>Vous trouverez votre carte grise en pièce jointe de ce mail.</p>
          <p style="margin-top: 30px;">
            <strong>Numéro de suivi :</strong> ${order.tracking_number}
          </p>
          <p style="margin-top: 30px; color: #666;">
            Cordialement,<br>
            L'équipe CarteGrise.com
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `carte-grise-${order.immatriculation}.pdf`,
          content: carteGriseBase64,
        },
      ],
    });

    if (error) {
      console.error('Resend error:', error);
      throw error;
    }

    console.log('Carte grise email sent successfully:', data);

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error sending carte grise email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
