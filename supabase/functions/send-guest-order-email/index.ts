import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  type: 'order_confirmation' | 'documents_received' | 'payment_confirmed' | 'processing' | 'completed';
  orderData: {
    tracking_number: string;
    email: string;
    nom: string;
    prenom: string;
    immatriculation: string;
    montant_ttc: number;
  };
}

const getEmailContent = (type: string, orderData: any) => {
  const baseUrl = "https://6e193db8-c6ad-48c6-854a-2294576c28c2.lovableproject.com";
  const trackingUrl = `${baseUrl}/suivi-commande?tracking=${orderData.tracking_number}`;
  
  switch (type) {
    case 'order_confirmation':
      return {
        subject: `Confirmation de commande - ${orderData.tracking_number}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Commande confirmée !</h1>
            <p>Bonjour ${orderData.prenom} ${orderData.nom},</p>
            <p>Nous avons bien reçu votre commande pour le véhicule <strong>${orderData.immatriculation}</strong>.</p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0;">Détails de votre commande</h2>
              <p><strong>Numéro de suivi:</strong> ${orderData.tracking_number}</p>
              <p><strong>Montant:</strong> ${orderData.montant_ttc.toFixed(2)}€ TTC</p>
            </div>

            <p><strong>Prochaines étapes:</strong></p>
            <ol>
              <li>Téléchargez vos documents sur la page de suivi</li>
              <li>Effectuez le paiement</li>
              <li>Nous traiterons votre dossier dès réception du paiement</li>
            </ol>

            <a href="${trackingUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Suivre ma commande
            </a>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              Vous pouvez suivre l'avancement de votre commande à tout moment avec votre numéro de suivi.
            </p>
          </div>
        `
      };

    case 'documents_received':
      return {
        subject: `Documents reçus - ${orderData.tracking_number}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Documents bien reçus !</h1>
            <p>Bonjour ${orderData.prenom} ${orderData.nom},</p>
            <p>Nous avons bien reçu vos documents pour le véhicule <strong>${orderData.immatriculation}</strong>.</p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Numéro de suivi:</strong> ${orderData.tracking_number}</p>
              <p>Il ne vous reste plus qu'à effectuer le paiement pour que nous puissions traiter votre dossier.</p>
            </div>

            <a href="${trackingUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Payer maintenant
            </a>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              Le paiement peut être effectué directement depuis votre page de suivi.
            </p>
          </div>
        `
      };

    case 'payment_confirmed':
      return {
        subject: `Paiement confirmé - ${orderData.tracking_number}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #10b981;">Paiement validé !</h1>
            <p>Bonjour ${orderData.prenom} ${orderData.nom},</p>
            <p>Votre paiement de <strong>${orderData.montant_ttc.toFixed(2)}€</strong> a été confirmé avec succès.</p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0;">Votre dossier est en cours de traitement</h2>
              <p><strong>Numéro de suivi:</strong> ${orderData.tracking_number}</p>
              <p><strong>Véhicule:</strong> ${orderData.immatriculation}</p>
            </div>

            <p>Notre équipe a commencé le traitement de votre dossier. Vous recevrez une notification dès que votre démarche sera finalisée.</p>

            <a href="${trackingUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Suivre ma commande
            </a>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              Merci pour votre confiance !
            </p>
          </div>
        `
      };

    case 'processing':
      return {
        subject: `Dossier en traitement - ${orderData.tracking_number}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Votre dossier est en cours de traitement</h1>
            <p>Bonjour ${orderData.prenom} ${orderData.nom},</p>
            <p>Nous traitons actuellement votre dossier pour le véhicule <strong>${orderData.immatriculation}</strong>.</p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Numéro de suivi:</strong> ${orderData.tracking_number}</p>
              <p>Votre dossier est entre de bonnes mains. Nous vous tiendrons informé de son avancement.</p>
            </div>

            <a href="${trackingUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Suivre ma commande
            </a>
          </div>
        `
      };

    case 'completed':
      return {
        subject: `Dossier finalisé - ${orderData.tracking_number}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #10b981;">Dossier finalisé !</h1>
            <p>Bonjour ${orderData.prenom} ${orderData.nom},</p>
            <p>Bonne nouvelle ! Votre dossier pour le véhicule <strong>${orderData.immatriculation}</strong> a été finalisé avec succès.</p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0;">✓ Dossier terminé</h2>
              <p><strong>Numéro de suivi:</strong> ${orderData.tracking_number}</p>
              <p>Tous les documents et démarches ont été complétés.</p>
            </div>

            <a href="${trackingUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Voir les détails
            </a>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              Merci d'avoir fait confiance à nos services !
            </p>
          </div>
        `
      };

    default:
      return {
        subject: `Mise à jour - ${orderData.tracking_number}`,
        html: `<p>Mise à jour de votre commande ${orderData.tracking_number}</p>`
      };
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, orderData }: EmailRequest = await req.json();

    console.log('Sending email:', { type, tracking: orderData.tracking_number });

    const { subject, html } = getEmailContent(type, orderData);

    const { data, error } = await resend.emails.send({
      from: 'CarteGrise.com <onboarding@resend.dev>',
      to: [orderData.email],
      subject,
      html,
    });

    if (error) {
      console.error('Resend error:', error);
      throw error;
    }

    console.log('Email sent successfully:', data);

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
