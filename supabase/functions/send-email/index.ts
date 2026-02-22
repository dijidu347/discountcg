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

// Validate either internal API key, service role key, anon key, OR any authenticated user
const validateAuth = async (req: Request): Promise<boolean> => {
  // Check internal API key first (for service-to-service calls)
  const providedKey = req.headers.get("x-internal-key");
  console.log("🔑 Internal key check:", providedKey ? "provided" : "not provided");
  if (providedKey && INTERNAL_API_KEY && providedKey === INTERNAL_API_KEY) {
    console.log("✅ Authenticated via internal API key");
    return true;
  }

  // Check for service role key (for edge-to-edge calls)
  const authHeader = req.headers.get("authorization");
  const apiKey = req.headers.get("apikey");
  console.log("🔐 Auth header check:", authHeader ? "provided" : "not provided");
  console.log("🔑 API key check:", apiKey ? "provided" : "not provided");
  
  // Accept service role key directly
  if (apiKey === supabaseServiceKey) {
    console.log("✅ Authenticated via service role key (apikey header)");
    return true;
  }
  
  // Accept anon key (for frontend calls) - since verify_jwt is false, this is safe
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (apiKey && supabaseAnonKey && apiKey === supabaseAnonKey) {
    console.log("✅ Authenticated via anon key (apikey header)");
    return true;
  }
  
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    
    // Check if token is the service role key itself
    if (token === supabaseServiceKey) {
      console.log("✅ Authenticated via service role key (bearer)");
      return true;
    }
    
    // Check any authenticated user JWT
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    console.log("👤 User check:", user ? `found (${user.id})` : "not found", userError ? `error: ${userError.message}` : "");
    
    if (user && !userError) {
      console.log("✅ Authenticated via user JWT");
      return true;
    }
  }

  console.log("❌ Authentication failed");
  return false;
};

interface EmailAttachment {
  filename: string;
  content: string; // base64 encoded
}

interface EmailRequest {
  type: string;
  to: string;
  data: Record<string, any>;
  attachments?: EmailAttachment[];
}

const getEmailTemplate = (type: string, data: any) => {
  const baseUrl = "https://discountcartegrise.fr";
  const trackingUrl = data?.tracking_number ? `${baseUrl}/suivi/${data.tracking_number}` : "";

  switch (type) {
    // === GUEST ORDER EMAILS ===
    case "order_confirmation":
      return {
        subject: `✅ Commande confirmée - ${data.tracking_number}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #22c55e;">Commande confirmée !</h1>
            <p>Bonjour ${data.prenom} ${data.nom},</p>
            <p>Nous avons bien reçu votre commande pour la carte grise du véhicule <strong>${data.immatriculation}</strong>.</p>
            
            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>Numéro de suivi :</strong> ${data.tracking_number}</p>
              <p style="margin: 8px 0;"><strong>Montant TTC :</strong> ${data.montant_ttc} €</p>
            </div>

            <p>Suivez votre commande en cliquant sur le bouton ci-dessous :</p>
            <a href="${trackingUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
              Suivre ma commande
            </a>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
          </div>
        `,
      };

    case "payment_confirmed":
      return {
        subject: `💳 Paiement confirmé - ${data.tracking_number}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #22c55e;">Paiement confirmé !</h1>
            <p>Bonjour ${data.prenom} ${data.nom},</p>
            <p>Votre paiement de <strong>${data.montant_ttc} €</strong> a été confirmé.</p>
            
            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>Numéro de suivi :</strong> ${data.tracking_number}</p>
              <p style="margin: 8px 0;"><strong>Immatriculation :</strong> ${data.immatriculation}</p>
              <p style="margin: 8px 0;"><strong>Montant :</strong> ${data.montant_ttc} €</p>
            </div>

            <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0;">
              <p style="margin: 0;"><strong>📎 Votre facture est jointe à cet email</strong></p>
            </div>

            <p>Nous allons maintenant traiter votre dossier. Vous recevrez un email dès qu'il y aura du nouveau.</p>
            
            <a href="${trackingUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
              Suivre ma commande
            </a>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
          </div>
        `,
      };

    case "document_rejected":
      return {
        subject: `⚠️ Documents à fournir - ${data.tracking_number}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #ef4444;">Documents à corriger</h1>
            <p>Bonjour ${data.prenom} ${data.nom},</p>
            <p>Certains documents nécessitent votre attention pour la commande <strong>${data.tracking_number}</strong>.</p>
            
            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #991b1b;">Documents concernés :</h3>
              <ul style="margin: 0; padding-left: 20px;">
                ${data.rejectedDocuments?.map((doc: any) => `
                  <li style="margin: 8px 0;">
                    <strong>${doc.nom}:</strong> ${doc.raison}
                  </li>
                `).join('') || '<li>Voir le détail sur votre espace de suivi</li>'}
              </ul>
            </div>

            <p>Veuillez télécharger les documents corrigés via votre espace de suivi :</p>
            
            <a href="${trackingUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
              Accéder à mon suivi
            </a>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
          </div>
        `,
      };

    case "completed":
      return {
        subject: `🎉 Votre carte grise est prête ! - ${data.tracking_number}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #22c55e;">Votre carte grise est prête !</h1>
            <p>Bonjour ${data.prenom} ${data.nom},</p>
            <p>Excellente nouvelle ! Votre carte grise pour le véhicule <strong>${data.immatriculation}</strong> est maintenant disponible.</p>
            
            <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>Numéro de suivi :</strong> ${data.tracking_number}</p>
              <p style="margin: 8px 0;">Vous pouvez télécharger votre carte grise depuis votre espace de suivi.</p>
            </div>

            <a href="${trackingUrl}" style="display: inline-block; background-color: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
              Télécharger ma carte grise
            </a>

            <p style="margin-top: 20px;">Merci de votre confiance !</p>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
          </div>
        `,
      };

    case "resubmission_payment_required":
      return {
        subject: `⚠️ Paiement requis pour renvoyer vos documents - ${data.tracking_number}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #f59e0b;">Paiement requis</h1>
            <p>Bonjour ${data.prenom} ${data.nom},</p>
            <p>Suite à des documents illisibles ou non recevables, un paiement de <strong>${data.amount} €</strong> est requis pour pouvoir renvoyer vos documents.</p>
            
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>Numéro de suivi :</strong> ${data.tracking_number}</p>
              <p style="margin: 8px 0;"><strong>Montant à payer :</strong> ${data.amount} €</p>
              ${data.reason ? `<p style="margin: 8px 0;"><strong>Motif :</strong> ${data.reason}</p>` : ''}
            </div>

            <p>Une fois le paiement effectué, vous pourrez renvoyer vos documents corrigés.</p>

            <a href="${trackingUrl}" style="display: inline-block; background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
              Payer et renvoyer mes documents
            </a>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
          </div>
        `,
      };

    case "demarche_resubmission_payment_required":
      return {
        subject: `⚠️ Paiement requis pour renvoyer les documents - ${data.tracking_number}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #f59e0b;">Paiement requis</h1>
            <p>Bonjour ${data.nom},</p>
            <p>Suite à des documents illisibles ou non recevables pour la démarche <strong>${data.immatriculation}</strong>, un paiement de <strong>${data.amount} €</strong> est requis pour pouvoir renvoyer les documents.</p>
            
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>N° Démarche :</strong> ${data.tracking_number}</p>
              <p style="margin: 8px 0;"><strong>Immatriculation :</strong> ${data.immatriculation}</p>
              <p style="margin: 8px 0;"><strong>Montant à payer :</strong> ${data.amount} €</p>
              ${data.reason ? `<p style="margin: 8px 0;"><strong>Motif :</strong> ${data.reason}</p>` : ''}
            </div>

            <p>Une fois le paiement effectué, vous pourrez renvoyer vos documents corrigés depuis votre espace garage.</p>

            <a href="${baseUrl}/demarche/${data.demarche_id}" style="display: inline-block; background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
              Accéder à ma démarche
            </a>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
          </div>
        `,
      };

    // === GARAGE/DEMARCHE EMAILS ===
    case "demarche_payment_confirmed":
      return {
        subject: `💳 Paiement reçu - Démarche ${data.demarcheId}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #22c55e;">Paiement confirmé</h1>
            <p>Bonjour ${data.customerName},</p>
            <p>Le paiement pour la démarche <strong>${data.demarcheId}</strong> a été confirmé.</p>
            
            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>Démarche :</strong> ${data.demarcheId}</p>
              <p style="margin: 8px 0;"><strong>Immatriculation :</strong> ${data.immatriculation}</p>
              <p style="margin: 8px 0;"><strong>Montant TTC :</strong> ${data.montantTTC} €</p>
            </div>

            <p>Le traitement de votre démarche va commencer.</p>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
          </div>
        `,
      };

    case "account_verified":
      return {
        subject: `✅ Compte vérifié - Bienvenue !`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #22c55e;">Compte vérifié !</h1>
            <p>Bonjour ${data.customerName},</p>
            <p>Félicitations ! Votre compte a été vérifié et activé avec succès.</p>
            
            <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 20px 0;">
              <p style="margin: 8px 0;">Vous pouvez maintenant accéder à toutes les fonctionnalités de la plateforme.</p>
            </div>

            <a href="${baseUrl}/dashboard" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
              Accéder au tableau de bord
            </a>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
          </div>
        `,
      };

    case "account_rejected":
      return {
        subject: `❌ Demande de vérification refusée`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #ef4444;">Demande refusée</h1>
            <p>Bonjour ${data.customerName},</p>
            <p>Malheureusement, votre demande de vérification de compte n'a pas pu être approuvée.</p>
            
            ${data.rejectionReason ? `
              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0;">
                <strong>Raison :</strong> ${data.rejectionReason}
              </div>
            ` : ''}

            <p>Si vous pensez qu'il s'agit d'une erreur, veuillez nous contacter.</p>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
          </div>
        `,
      };

    case "admin_document":
      return {
        subject: `📄 Document disponible - ${data.tracking_number}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #3b82f6;">Nouveau document disponible</h1>
            <p>Bonjour ${data.prenom} ${data.nom},</p>
            <p>Un nouveau document est disponible pour votre commande <strong>${data.tracking_number}</strong>.</p>
            
            <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>📄 ${data.document_name}</strong></p>
              ${data.description ? `<p style="margin: 8px 0; color: #6b7280;">${data.description}</p>` : ''}
            </div>

            <p>Vous pouvez consulter et télécharger ce document sur votre page de suivi :</p>

            <a href="${trackingUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
              Accéder à mon suivi
            </a>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
          </div>
        `,
      };

    case "admin_new_demarche":
      return {
        subject: `🆕 Nouvelle demande à traiter - ${data.reference}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #3b82f6;">Nouvelle demande à traiter</h1>
            <p>Une nouvelle demande est disponible et nécessite votre attention.</p>
            
            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>Type :</strong> ${data.type}</p>
              <p style="margin: 8px 0;"><strong>Référence :</strong> ${data.reference}</p>
              <p style="margin: 8px 0;"><strong>Immatriculation :</strong> ${data.immatriculation}</p>
              <p style="margin: 8px 0;"><strong>Client :</strong> ${data.client_name}</p>
              <p style="margin: 8px 0;"><strong>Montant TTC :</strong> ${data.montant_ttc} €</p>
              ${data.is_free_token ? '<p style="margin: 8px 0; color: #22c55e;"><strong>🎁 Démarche offerte (jeton gratuit)</strong></p>' : ''}
            </div>

            <a href="https://discountcartegrise.fr/admin/demarches" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
              Accéder au tableau admin
            </a>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">Cet email a été envoyé automatiquement.</p>
          </div>
        `,
      };

    case "garage_demarche_confirmation":
      return {
        subject: `✅ Démarche soumise - ${data.reference}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #22c55e;">Démarche soumise avec succès !</h1>
            <p>Bonjour ${data.garage_name},</p>
            <p>Votre démarche a bien été enregistrée et sera traitée dans les plus brefs délais.</p>
            
            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>Type :</strong> ${data.type}</p>
              <p style="margin: 8px 0;"><strong>Référence :</strong> ${data.reference}</p>
              <p style="margin: 8px 0;"><strong>Immatriculation :</strong> ${data.immatriculation}</p>
              <p style="margin: 8px 0;"><strong>Montant TTC :</strong> ${data.montant_ttc} €</p>
              ${data.is_free_token ? '<p style="margin: 8px 0; color: #22c55e;"><strong>🎁 Démarche offerte (jeton gratuit utilisé)</strong></p>' : ''}
            </div>

            <p>Vous pouvez suivre l'avancement de votre démarche depuis votre espace garage.</p>

            <a href="https://discountcartegrise.fr/mes-demarches" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
              Voir mes démarches
            </a>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
          </div>
        `,
      };

    // === GARAGE NOTIFICATION EMAILS ===
    case "garage_document_received":
      return {
        subject: `📄 Nouveau document disponible - ${data.reference}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #3b82f6;">Nouveau document disponible</h1>
            <p>Bonjour ${data.garage_name},</p>
            <p>Un nouveau document est disponible pour votre démarche <strong>${data.reference}</strong> (${data.immatriculation}).</p>
            
            <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>📄 ${data.document_name}</strong></p>
              <p style="margin: 8px 0;"><strong>Immatriculation :</strong> ${data.immatriculation}</p>
            </div>

            <p>Vous pouvez consulter et télécharger ce document depuis votre espace garage :</p>

            <a href="${baseUrl}/demarche/${data.demarche_id}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
              Accéder à ma démarche
            </a>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
          </div>
        `,
      };

    case "garage_demarche_completed":
      return {
        subject: `🎉 Votre démarche est terminée ! - ${data.reference}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #22c55e;">Votre démarche est terminée !</h1>
            <p>Bonjour ${data.garage_name},</p>
            <p>Excellente nouvelle ! Votre démarche <strong>${data.reference}</strong> pour le véhicule <strong>${data.immatriculation}</strong> a été traitée avec succès.</p>
            
            <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>Type :</strong> ${data.type}</p>
              <p style="margin: 8px 0;"><strong>Référence :</strong> ${data.reference}</p>
              <p style="margin: 8px 0;"><strong>Immatriculation :</strong> ${data.immatriculation}</p>
            </div>

            <p>Les documents finaux sont disponibles dans votre espace garage. Vous pouvez les télécharger dès maintenant.</p>

            <a href="${baseUrl}/demarche/${data.demarche_id}" style="display: inline-block; background-color: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
              Télécharger mes documents
            </a>

            <p style="margin-top: 20px;">Merci de votre confiance !</p>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
          </div>
        `,
      };

    // === RECHARGE & BALANCE PAYMENT EMAILS ===
    case "recharge_confirmed":
      return {
        subject: `💰 Recharge confirmée - ${data.amount}€ ajoutés à votre solde`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #22c55e;">Recharge confirmée !</h1>
            <p>Bonjour ${data.garage_name},</p>
            <p>Votre recharge de solde a été effectuée avec succès.</p>
            
            <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>💰 Montant rechargé :</strong> ${data.amount} €</p>
              <p style="margin: 8px 0;"><strong>💳 Montant payé :</strong> ${data.price} €</p>
              <p style="margin: 8px 0;"><strong>📊 Nouveau solde :</strong> ${data.new_balance} €</p>
            </div>

            <p>Vous pouvez utiliser ce solde pour payer vos prochaines démarches.</p>

            <a href="https://discountcartegrise.fr/dashboard" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
              Accéder au tableau de bord
            </a>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
          </div>
        `,
      };

    case "balance_payment_confirmed":
      return {
        subject: `✅ Paiement par solde confirmé - ${data.demarche_id}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #22c55e;">Paiement validé !</h1>
            <p>Bonjour ${data.garage_name},</p>
            <p>Votre démarche a été payée avec succès en utilisant votre solde.</p>
            
            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>Type :</strong> ${data.type}</p>
              <p style="margin: 8px 0;"><strong>Référence :</strong> ${data.demarche_id}</p>
              <p style="margin: 8px 0;"><strong>Immatriculation :</strong> ${data.immatriculation}</p>
            </div>

            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>💰 Montant débité :</strong> ${data.amount} €</p>
              <p style="margin: 8px 0;"><strong>📊 Solde restant :</strong> ${data.new_balance} €</p>
            </div>

            <p>Le traitement de votre démarche va commencer.</p>

            <a href="https://discountcartegrise.fr/mes-demarches" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
              Voir mes démarches
            </a>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
          </div>
        `,
      };

    case "admin_balance_recharge":
      return {
        subject: `💰 [ADMIN] Nouvelle recharge de solde - ${data.garage_name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #3b82f6;">Nouvelle recharge de solde</h1>
            <p>Un garage vient de recharger son compte.</p>
            
            <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>🏢 Garage :</strong> ${data.garage_name}</p>
              <p style="margin: 8px 0;"><strong>📧 Email :</strong> ${data.garage_email}</p>
            </div>

            <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>💳 Montant payé :</strong> ${data.price} €</p>
              <p style="margin: 8px 0;"><strong>💰 Crédit ajouté :</strong> ${data.amount} €</p>
              <p style="margin: 8px 0;"><strong>📊 Nouveau solde :</strong> ${data.new_balance} €</p>
            </div>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">Notification automatique - DiscountCarteGrise</p>
          </div>
        `,
      };

    case "admin_verification_request":
      return {
        subject: `🔍 [ADMIN] Nouveau garage à vérifier - ${data.garage_name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #f59e0b;">Nouvelle demande de vérification</h1>
            <p>Un garage vient de soumettre ses documents de vérification.</p>
            
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>🏢 Garage :</strong> ${data.garage_name}</p>
              <p style="margin: 8px 0;"><strong>📧 Email :</strong> ${data.garage_email}</p>
            </div>

            <p>Veuillez vérifier les documents soumis dans l'interface d'administration.</p>

            <a href="https://discountcartegrise.fr/admin/manage-garages" style="display: inline-block; background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
              Vérifier le garage
            </a>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">Notification automatique - DiscountCarteGrise</p>
          </div>
        `,
      };

    case "custom_notification":
      return {
        subject: data.subject || `📬 Notification - DiscountCarteGrise`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #3b82f6;">📬 Notification</h1>
            <p>Bonjour ${data.customerName || 'Client'},</p>
            
            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0; white-space: pre-wrap;">
              ${data.message}
            </div>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">L'équipe DiscountCarteGrise</p>
            <p style="color: #6b7280; font-size: 12px;">contact@discountcartegrise.fr</p>
          </div>
        `,
      };

    case "promotion_free_token":
      return {
        subject: `🎁 Offre spéciale - Jeton OFFERT pour votre première démarche !`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🎁 JETON OFFERT !</h1>
              <p style="color: rgba(255,255,255,0.9); font-size: 18px; margin-top: 10px;">Votre première démarche DA ou DC est gratuite</p>
            </div>
            
            <p>Bonjour${data.prenom ? ` ${data.prenom}` : ''},</p>
            
            <p>Nous avons le plaisir de vous offrir <strong>un jeton gratuit</strong> pour réaliser votre première démarche !</p>
            
            <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
              <h3 style="margin-top: 0; color: #166534;">✅ Ce que vous obtenez :</h3>
              <ul style="margin: 0; padding-left: 20px; color: #15803d;">
                <li style="margin: 8px 0;"><strong>1 jeton offert</strong> à l'inscription</li>
                <li style="margin: 8px 0;">Utilisable pour une <strong>DA</strong> (Déclaration d'Achat) ou <strong>DC</strong> (Déclaration de Cession)</li>
                <li style="margin: 8px 0;">Traitement rapide sous 24h</li>
                <li style="margin: 8px 0;">Support dédié par email</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://discountcartegrise.fr/register" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold;">
                Créer mon compte et profiter de l'offre
              </a>
            </div>

            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
              <p style="margin: 0; color: #92400e;">
                <strong>💡 Bon à savoir :</strong> Après votre première démarche gratuite, profitez de nos tarifs avantageux et rechargez votre solde avec des bonus allant jusqu'à +25% !
              </p>
            </div>

            <p>N'hésitez pas à nous contacter si vous avez des questions.</p>
            
            <p style="margin-top: 20px;">À très bientôt,<br><strong>L'équipe DiscountCarteGrise</strong></p>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; text-align: center;">
              DiscountCarteGrise - Service de cartes grises en ligne<br>
              contact@discountcartegrise.fr
            </p>
          </div>
        `,
      };

    case "simple_text":
      return {
        subject: data.subject || "Message",
        html: data.html || `<div style="font-family: Arial, sans-serif;">${data.message || ''}</div>`,
      };

    default:
      throw new Error(`Type d'email non supporté: ${type}`);
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate authentication (internal key OR admin JWT)
  const isAuthorized = await validateAuth(req);
  if (!isAuthorized) {
    console.error("❌ Unauthorized: Invalid or missing authentication");
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const { type, to, data, attachments, from: customFrom }: EmailRequest & { from?: string } = await req.json();

    console.log(`📧 Envoi email type: ${type} à ${to}`);

    const { subject, html } = getEmailTemplate(type, data);

    // Préparer les pièces jointes si présentes
    const emailAttachments = attachments?.map(att => ({
      filename: att.filename,
      content: att.content,
    }));

    const emailResponse = await resend.emails.send({
      from: customFrom || "DiscountCarteGrise <noreply@discountcartegrise.fr>",
      reply_to: customFrom ? undefined : "contact@discountcartegrise.fr",
      to: to,
      subject: subject,
      html: html,
      attachments: emailAttachments,
    });

    console.log("✅ Email envoyé avec succès:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("❌ Erreur envoi email:", error);
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
