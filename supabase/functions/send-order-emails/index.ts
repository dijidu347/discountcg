import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: 'order_complete' | 'document_rejected' | 'payment_confirmed' | 'account_verified' | 'account_rejected';
  orderId?: string;
  trackingNumber?: string;
  demarcheId?: string;
  email: string;
  customerName: string;
  immatriculation?: string;
  rejectedDocuments?: Array<{ nom: string; raison: string }>;
  montantTTC?: number;
  rejectionReason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const emailData: EmailRequest = await req.json();
    
    let subject = "";
    let html = "";

    switch (emailData.type) {
      case 'order_complete':
        subject = `✅ Votre démarche ${emailData.immatriculation} est terminée`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #22c55e;">Démarche Terminée</h1>
            <p>Bonjour ${emailData.customerName},</p>
            <p>Nous avons le plaisir de vous informer que votre démarche pour le véhicule <strong>${emailData.immatriculation}</strong> est maintenant terminée.</p>
            ${emailData.trackingNumber ? `<p>Numéro de suivi: <strong>${emailData.trackingNumber}</strong></p>` : ''}
            <p>Merci de votre confiance.</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
          </div>
        `;
        break;

      case 'document_rejected':
        const docList = emailData.rejectedDocuments?.map(doc => 
          `<li><strong>${doc.nom}</strong>: ${doc.raison}</li>`
        ).join('') || '';
        
        subject = `⚠️ Document(s) à revoir pour ${emailData.immatriculation}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #ef4444;">Document(s) à revoir</h1>
            <p>Bonjour ${emailData.customerName},</p>
            <p>Nous avons examiné vos documents pour le véhicule <strong>${emailData.immatriculation}</strong>.</p>
            <p>Malheureusement, les documents suivants nécessitent des corrections:</p>
            <ul style="color: #dc2626; background-color: #fef2f2; padding: 15px; border-left: 4px solid #ef4444;">
              ${docList}
            </ul>
            ${emailData.trackingNumber ? `<p>Numéro de suivi: <strong>${emailData.trackingNumber}</strong></p>` : ''}
            ${emailData.demarcheId ? `<p>Numéro de démarche: <strong>${emailData.demarcheId}</strong></p>` : ''}
            <p>Merci de télécharger à nouveau les documents corrigés.</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
          </div>
        `;
        break;

      case 'payment_confirmed':
        subject = `✅ Paiement confirmé - ${emailData.immatriculation}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #22c55e;">Paiement Confirmé</h1>
            <p>Bonjour ${emailData.customerName},</p>
            <p>Nous avons bien reçu votre paiement de <strong>${emailData.montantTTC}€</strong> pour le véhicule <strong>${emailData.immatriculation}</strong>.</p>
            <p>Votre commande est confirmée et nous commençons le traitement de votre dossier.</p>
            ${emailData.trackingNumber ? `<p>Numéro de suivi: <strong>${emailData.trackingNumber}</strong></p>` : ''}
            ${emailData.demarcheId ? `<p>Numéro de démarche: <strong>${emailData.demarcheId}</strong></p>` : ''}
            <p>Vous recevrez un nouvel email une fois votre démarche terminée.</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
          </div>
        `;
        break;

      case 'account_verified':
        subject = `✅ Votre compte a été vérifié`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #22c55e;">Compte Vérifié</h1>
            <p>Bonjour ${emailData.customerName},</p>
            <p>Nous avons le plaisir de vous informer que votre compte professionnel a été <strong>vérifié avec succès</strong>.</p>
            <p>Vous pouvez maintenant profiter de tous les avantages de votre compte vérifié :</p>
            <ul style="line-height: 1.8;">
              <li>Badge "Vérifié" sur votre compte</li>
              <li>Confiance renforcée auprès de vos clients</li>
              <li>Accès à toutes les fonctionnalités</li>
            </ul>
            <p>Merci de votre confiance.</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
          </div>
        `;
        break;

      case 'account_rejected':
        subject = `⚠️ Vérification de compte - Action requise`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #ef4444;">Vérification non validée</h1>
            <p>Bonjour ${emailData.customerName},</p>
            <p>Nous avons examiné votre demande de vérification de compte.</p>
            <p>Malheureusement, nous ne pouvons pas valider votre compte pour la raison suivante :</p>
            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
              <p style="color: #dc2626; margin: 0;">${emailData.rejectionReason}</p>
            </div>
            <p>Pour finaliser la vérification de votre compte, veuillez :</p>
            <ul style="line-height: 1.8;">
              <li>Corriger les documents requis</li>
              <li>Soumettre à nouveau votre demande depuis votre espace</li>
            </ul>
            <p>Notre équipe reste à votre disposition pour toute question.</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
          </div>
        `;
        break;
    }

    console.log(`Sending email type: ${emailData.type} to ${emailData.email}`);

    const { data, error } = await resend.emails.send({
      from: "Carte Grise <onboarding@resend.dev>",
      to: [emailData.email],
      subject: subject,
      html: html,
    });

    if (error) {
      console.error("Error sending email:", error);
      throw error;
    }

    console.log("Email sent successfully:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-order-emails function:", error);
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
