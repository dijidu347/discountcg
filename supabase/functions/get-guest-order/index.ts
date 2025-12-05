import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tracking_number, email } = await req.json();

    // Validate inputs
    if (!tracking_number || typeof tracking_number !== 'string') {
      console.error('Invalid tracking_number provided');
      return new Response(
        JSON.stringify({ success: false, error: 'Numéro de suivi invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Basic tracking number format validation (TRK-XXXXXXXX)
    const trackingRegex = /^TRK-[A-Z0-9]{8}$/;
    if (!trackingRegex.test(tracking_number)) {
      console.error('Invalid tracking number format:', tracking_number);
      return new Response(
        JSON.stringify({ success: false, error: 'Format de numéro de suivi invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client for database access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Looking up order with tracking:', tracking_number);

    // Query guest order by tracking number
    let query = supabase
      .from('guest_orders')
      .select('*')
      .eq('tracking_number', tracking_number);
    
    // If email is provided, also validate it matches
    if (email && typeof email === 'string') {
      query = query.eq('email', email.toLowerCase().trim());
    }

    const { data: order, error } = await query.single();

    if (error || !order) {
      console.log('Order not found for tracking:', tracking_number);
      return new Response(
        JSON.stringify({ success: false, error: 'Commande introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Order found:', order.id);

    // Get related documents
    const { data: documents } = await supabase
      .from('guest_order_documents')
      .select('*')
      .eq('order_id', order.id);

    // Get admin documents
    const { data: adminDocuments } = await supabase
      .from('guest_order_admin_documents')
      .select('*')
      .eq('order_id', order.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: { 
          order, 
          documents: documents || [], 
          adminDocuments: adminDocuments || [] 
        } 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in get-guest-order:', error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
