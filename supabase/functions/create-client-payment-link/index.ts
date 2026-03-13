import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized - Missing authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Verifying user token...');

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      console.error('Token verification failed:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized - Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Authenticated user:', user.id);

    const body = await req.json();
    const { demarcheId, paymentMode: requestedMode, clientEmail, clientPhone } = body;

    if (!demarcheId) {
      return new Response(JSON.stringify({ error: 'demarcheId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Fetching demarche with ID:', demarcheId);

    // Get demarche details
    const { data: demarche, error: demarcheError } = await supabaseClient
      .from('demarches')
      .select('*, garages!inner(*), vehicules(immatriculation)')
      .eq('id', demarcheId)
      .single();

    if (demarcheError || !demarche) {
      console.error('Demarche error:', demarcheError);
      return new Response(JSON.stringify({ error: 'Démarche not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve TEMP immatriculation from vehicle
    const realImmat = (demarche.immatriculation === 'TEMP' && demarche.vehicules?.immatriculation)
      ? demarche.vehicules.immatriculation
      : demarche.immatriculation;

    // Check user owns this garage
    if (demarche.garages.user_id !== user.id) {
      console.error('Ownership check failed');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Ownership check passed');

    // Use requested mode from body as override (workaround for DB save issue)
    const effectiveMode = requestedMode || demarche.payment_mode;
    console.log('Effective payment mode:', effectiveMode, '(db:', demarche.payment_mode, ', requested:', requestedMode, ')');

    if (effectiveMode === 'pro_pays_all') {
      return new Response(JSON.stringify({ error: 'Client payment link not needed for pro_pays_all mode' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate client payment token
    const clientPaymentToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    console.log('Generated client_payment_token:', clientPaymentToken);

    // Update demarche with token, status, and payment_mode
    const { error: updateError } = await supabaseClient
      .from('demarches')
      .update({
        payment_mode: effectiveMode,
        client_email: clientEmail || demarche.client_email || null,
        client_phone: clientPhone || demarche.client_phone || null,
        client_payment_token: clientPaymentToken,
        client_payment_token_expires_at: expiresAt.toISOString(),
        status: 'en_attente_paiement_client',
        updated_at: new Date().toISOString(),
      })
      .eq('id', demarcheId);

    if (updateError) {
      console.error('Failed to update demarche:', updateError);
      throw new Error('Failed to generate payment link');
    }

    console.log('Demarche updated with payment token');

    const paymentUrl = `https://discountcartegrise.fr/paiement-client/${clientPaymentToken}`;

    // Send email to client - use clientEmail from body as fallback
    const effectiveClientEmail = clientEmail || demarche.client_email;
    if (effectiveClientEmail) {
      console.log('Sending client payment link email to:', effectiveClientEmail);

      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

      const emailResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
          },
          body: JSON.stringify({
            type: 'client_payment_link',
            to: effectiveClientEmail,
            data: {
              payment_url: paymentUrl,
              garage_name: demarche.garages.raison_sociale,
              immatriculation: realImmat,
              type: demarche.type,
              client_nom: demarche.client_nom || '',
              client_prenom: demarche.client_prenom || '',
              expires_at: expiresAt.toISOString(),
            },
          }),
        }
      );

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error('Email send failed:', errorText);
      } else {
        console.log('Client payment link email sent successfully');
      }
    } else {
      console.log('No client_email on demarche, skipping email');
    }

    return new Response(
      JSON.stringify({
        paymentUrl,
        token: clientPaymentToken,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in create-client-payment-link:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
