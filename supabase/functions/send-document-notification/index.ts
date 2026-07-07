import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-key",
};

const INTERNAL_API_KEY = Deno.env.get("INTERNAL_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Validate either internal API key OR admin JWT
const validateAuth = async (req: Request): Promise<boolean> => {
  const providedKey = req.headers.get("x-internal-key");
  if (providedKey === INTERNAL_API_KEY) {
    return true;
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
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

interface DocumentNotificationRequest {
  type: 'validation_approved' | 'validation_rejected';
  orderData: {
    tracking_number: string;
    email: string;
    nom: string;
    prenom: string;
    documentName: string;
    rejectionReason?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
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
    const { type, orderData }: DocumentNotificationRequest = await req.json();

    let subject = "";
    let html = "";

    if (type === 'validation_approved') {
      subject = "✅ Document validé - " + orderData.tracking_number;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #22c55e;">Document validé</h1>
          <p>Bonjour ${orderData.prenom} ${orderData.nom},</p>
          <p>Votre document <strong>${orderData.documentName}</strong> a été validé avec succès.</p>
          <p>Numéro de suivi : <strong>${orderData.tracking_number}</strong></p>
          <p>Nous continuons le traitement de votre dossier.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
        </div>
      `;
    } else if (type === 'validation_rejected') {
      subject = "⚠️ Document refusé - Action requise - " + orderData.tracking_number;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #ef4444;">Document refusé</h1>
          <p>Bonjour ${orderData.prenom} ${orderData.nom},</p>
          <p>Malheureusement, votre document <strong>${orderData.documentName}</strong> n'a pas pu être validé.</p>
          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 16px 0;">
            <strong>Raison :</strong> ${orderData.rejectionReason || 'Document illisible ou incomplet'}
          </div>
          <p>Veuillez télécharger un nouveau document via votre page de suivi :</p>
          <p><a href="https://discountcartegrise.fr/suivi/${orderData.tracking_number}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 16px 0;">Accéder à mon suivi</a></p>
          <p>Numéro de suivi : <strong>${orderData.tracking_number}</strong></p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
        </div>
      `;
    }

    const emailResponse = await resend.emails.send({
      from: "DiscountCarteGrise <noreply@discountcartegrise.fr>",
      to: orderData.email,
      subject: subject,
      html: html,
    });

    if (emailResponse.error) {
      console.error("❌ Resend a refusé l'envoi:", emailResponse.error);
      return new Response(
        JSON.stringify({ error: emailResponse.error.message || "Échec Resend", resend_error: emailResponse.error }),
        { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
