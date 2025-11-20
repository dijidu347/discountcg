-- Create email_templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL UNIQUE,
  subject text NOT NULL,
  html_content text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Policies for email_templates
CREATE POLICY "Anyone can view email templates"
  ON public.email_templates
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage email templates"
  ON public.email_templates
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default templates
INSERT INTO public.email_templates (type, subject, html_content, description) VALUES
(
  'order_confirmation',
  'Confirmation de votre commande - {{tracking_number}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h1 style="color: #2563eb;">Commande confirmée !</h1>
    <p>Bonjour {{prenom}} {{nom}},</p>
    <p>Nous avons bien reçu votre commande pour le véhicule <strong>{{immatriculation}}</strong>.</p>
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h2 style="margin-top: 0;">Détails de la commande</h2>
      <p><strong>Numéro de suivi :</strong> {{tracking_number}}</p>
      <p><strong>Montant TTC :</strong> {{montant_ttc}}€</p>
      <p><strong>Véhicule :</strong> {{marque}} {{modele}}</p>
    </div>
    <p>Vous pouvez suivre l''état de votre commande à tout moment :</p>
    <a href="{{tracking_url}}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;">Suivre ma commande</a>
    <p style="color: #6b7280; margin-top: 30px;">À bientôt,<br>L''équipe</p>
  </div>',
  'Email envoyé après création de la commande'
),
(
  'payment_confirmed',
  'Paiement confirmé - {{tracking_number}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h1 style="color: #10b981;">✓ Paiement confirmé</h1>
    <p>Bonjour {{prenom}} {{nom}},</p>
    <p>Nous vous confirmons la bonne réception de votre paiement de <strong>{{montant_ttc}}€</strong>.</p>
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p><strong>Numéro de suivi :</strong> {{tracking_number}}</p>
      <p><strong>Véhicule :</strong> {{immatriculation}}</p>
    </div>
    <p>Votre dossier va maintenant être traité par nos équipes.</p>
    <a href="{{tracking_url}}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;">Suivre ma commande</a>
    <p style="color: #6b7280; margin-top: 30px;">Cordialement,<br>L''équipe</p>
  </div>',
  'Email envoyé après confirmation du paiement'
),
(
  'documents_received',
  'Documents reçus - {{tracking_number}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h1 style="color: #2563eb;">Documents reçus</h1>
    <p>Bonjour {{prenom}} {{nom}},</p>
    <p>Nous avons bien reçu vos documents pour le véhicule <strong>{{immatriculation}}</strong>.</p>
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p><strong>Numéro de suivi :</strong> {{tracking_number}}</p>
    </div>
    <p>Nos équipes vont maintenant les vérifier et traiter votre dossier.</p>
    <a href="{{tracking_url}}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;">Suivre ma commande</a>
    <p style="color: #6b7280; margin-top: 30px;">Cordialement,<br>L''équipe</p>
  </div>',
  'Email envoyé après réception des documents'
),
(
  'processing',
  'Dossier en cours de traitement - {{tracking_number}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h1 style="color: #f59e0b;">📋 Dossier en traitement</h1>
    <p>Bonjour {{prenom}} {{nom}},</p>
    <p>Votre dossier pour le véhicule <strong>{{immatriculation}}</strong> est actuellement en cours de traitement.</p>
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p><strong>Numéro de suivi :</strong> {{tracking_number}}</p>
    </div>
    <p>Nous reviendrons vers vous dès que possible avec les prochaines étapes.</p>
    <a href="{{tracking_url}}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;">Suivre ma commande</a>
    <p style="color: #6b7280; margin-top: 30px;">Cordialement,<br>L''équipe</p>
  </div>',
  'Email envoyé quand le dossier est en traitement'
),
(
  'completed',
  'Dossier finalisé - {{tracking_number}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h1 style="color: #10b981;">✓ Dossier finalisé</h1>
    <p>Bonjour {{prenom}} {{nom}},</p>
    <p>Excellente nouvelle ! Votre dossier pour le véhicule <strong>{{immatriculation}}</strong> est maintenant finalisé.</p>
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p><strong>Numéro de suivi :</strong> {{tracking_number}}</p>
    </div>
    <p>Tous vos documents sont prêts et ont été traités avec succès.</p>
    <a href="{{tracking_url}}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;">Voir les détails</a>
    <p style="color: #6b7280; margin-top: 30px;">Merci de votre confiance,<br>L''équipe</p>
  </div>',
  'Email envoyé quand le dossier est terminé'
);

-- Trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();