import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-key',
};

const INTERNAL_API_KEY = Deno.env.get("INTERNAL_API_KEY");

// Validate either internal API key OR admin JWT
const validateAuth = async (req: Request): Promise<boolean> => {
  const providedKey = req.headers.get("x-internal-key");
  if (providedKey === INTERNAL_API_KEY) {
    return true;
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (user && !userError) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();
      
      if (roleData) return true;
    }
  }

  return false;
};

interface SendCarteGriseRequest {
  orderId: string;
  carteGriseUrl: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const isAuthorized = await validateAuth(req);
  if (!isAuthorized) {
    console.error("Unauthorized: Invalid or missing authentication");
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const { orderId, carteGriseUrl }: SendCarteGriseRequest = await req.json();

    console.log('Sending carte grise email for order:', orderId);

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('guest_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    // Le stockage des documents invites est prive : son adresse publique ne
    // sert plus. On lit le fichier directement avec la cle de service, a partir
    // du chemin contenu dans l'URL enregistree.
    const correspondance = carteGriseUrl.match(/\/storage\/v1\/object\/(?:public\/|sign\/)?([^/]+)\/([^?]+)/);
    if (!correspondance) throw new Error('Adresse de carte grise invalide');
    const [, bucketCarteGrise, cheminCarteGrise] = correspondance;
    const { data: fichierCarteGrise, error: erreurLecture } = await supabase.storage
      .from(bucketCarteGrise)
      .download(decodeURIComponent(cheminCarteGrise));
    if (erreurLecture || !fichierCarteGrise) {
      throw new Error('Carte grise introuvable dans le stockage : ' + (erreurLecture?.message ?? ''));
    }
    const octets = new Uint8Array(await fichierCarteGrise.arrayBuffer());
    // Conversion par blocs : etaler tout le fichier dans String.fromCharCode
    // depasse la pile d'appels des quelques centaines de Ko.
    let binaire = '';
    for (let i = 0; i < octets.length; i += 0x8000) {
      binaire += String.fromCharCode(...octets.subarray(i, i + 0x8000));
    }
    const carteGriseBase64 = btoa(binaire);

    const { data, error } = await resend.emails.send({
      from: 'DiscountCarteGrise <noreply@discountcartegrise.fr>',
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
            L'équipe DiscountCarteGrise
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
