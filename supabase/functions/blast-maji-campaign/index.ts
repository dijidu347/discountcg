import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_TOKEN = Deno.env.get('INTERNAL_API_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;

const SUBJECT = 'Lancez votre dépôt-vente automobile avec MaJi Auto';
const FROM = 'MaJi Auto <noreply@discountcartegrise.fr>';
const REPLY_TO = 'contact@maji-auto.fr';

const HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lancez votre dépôt-vente automobile avec MaJi Auto</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Helvetica, Arial, sans-serif; }
    .preheader { display: none; max-height: 0; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: transparent; }
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .content { padding: 20px !important; }
      .cta-button { width: 100% !important; display: block !important; text-align: center !important; }
    }
  </style>
</head>
<body>
  <span class="preheader">Recevez des leads vendeurs qualifiés sur votre secteur — vos 5 premiers mandats offerts.</span>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="container" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color: #ffffff; padding: 24px; text-align: center;">
              <img src="https://discountcartegrise.fr/__l5e/assets-v1/ef9e0d4d-81fb-41e4-ac6f-8fe08268136f/maji-logo.png" alt="MaJi Auto" width="140" style="display: block; margin: 0 auto; max-width: 140px;">
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td style="padding: 0;">
              <div style="background-color: #0066cc; padding: 40px 32px; text-align: center; color: #ffffff;">
                <p style="margin: 0; font-size: 22px; font-weight: 700;">Lancez votre dépôt-vente automobile</p>
                <p style="margin: 12px 0 0; font-size: 15px; opacity: 0.95;">Leads vendeurs entrants • Zone exclusive • Sans investissement</p>
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="content" style="padding: 40px 32px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333333;">Bonjour,</p>

              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333333;">
                Vous gérez vos cartes grises avec <strong>DiscountCG</strong> — vous êtes donc déjà dans l'univers de l'automobile.
              </p>

              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333333;">
                Et si vous ajoutiez une <strong>nouvelle source de revenus</strong> avec le dépôt-vente automobile ?
              </p>

              <h2 style="margin: 32px 0 16px; font-size: 20px; color: #008CFF;">Le principe MaJi Auto est simple</h2>
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #333333;">
                Vous n'avez pas à faire de prospection à froid. <strong>Nous générons pour vous des leads vendeurs sur votre secteur</strong> : des particuliers qui souhaitent vendre leur voiture et qui vous contactent directement par téléphone.
              </p>
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #333333;">
                Ensuite, c'est vous qui prenez le relais : vous échangez avec le vendeur, vous qualifiez son véhicule, vous prenez rendez-vous, vous signez le mandat, puis vous gérez la vente.
              </p>
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #333333;">
                Concrètement, le vendeur vous confie sa voiture. Vous vous occupez de la mise en annonce, des photos, des visites, des échanges acheteurs, du financement, des garanties, du paiement sécurisé et de l'administratif.
              </p>
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #333333;">
                Le vendeur touche son prix net, et vous vous rémunérez sur l'acheteur — <strong>jamais sur le vendeur</strong>.
              </p>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #333333;">
                C'est le métier d'agent immobilier appliqué à la voiture, et ça se cumule parfaitement avec une activité de garage, mandataire, négociant ou professionnel de l'automobile.
              </p>

              <h2 style="margin: 32px 0 16px; font-size: 20px; color: #008CFF;">Ce qu'on vous apporte pour démarrer</h2>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr><td style="padding: 8px 0; font-size: 16px; line-height: 1.5; color: #333333;">📞 Des leads vendeurs entrants sur votre secteur</td></tr>
                <tr><td style="padding: 8px 0; font-size: 16px; line-height: 1.5; color: #333333;">🎁 Vos 5 premiers mandats offerts</td></tr>
                <tr><td style="padding: 8px 0; font-size: 16px; line-height: 1.5; color: #333333;">🖥️ Un cockpit numérique complet : leads, agenda, annonces, mandats, signatures électroniques et facturation</td></tr>
                <tr><td style="padding: 8px 0; font-size: 16px; line-height: 1.5; color: #333333;">🎓 Une formation complète au dépôt-vente automobile</td></tr>
                <tr><td style="padding: 8px 0; font-size: 16px; line-height: 1.5; color: #333333;">📄 La génération automatique des documents : mandats, bons de livraison, CERFA</td></tr>
                <tr><td style="padding: 8px 0; font-size: 16px; line-height: 1.5; color: #333333;">🗺️ Une exclusivité de zone : un seul agent par secteur</td></tr>
              </table>

              <h2 style="margin: 32px 0 16px; font-size: 20px; color: #008CFF;">L'offre</h2>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8fbff; border-left: 4px solid #008CFF;">
                <tr><td style="padding: 16px; font-size: 16px; line-height: 1.6; color: #333333;">
                  <p style="margin: 0 0 6px;">✅ <strong>0 €</strong> de frais d'entrée</p>
                  <p style="margin: 0 0 6px;">✅ <strong>99 €/mois</strong> d'abonnement réseau</p>
                  <p style="margin: 0 0 6px;">✅ <strong>80 €</strong> par mandat validé — vos <strong>5 premiers sont offerts</strong></p>
                  <p style="margin: 0;">✅ <strong>Sans engagement</strong></p>
                </td></tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 24px 0; background-color: #fff8e1; border-left: 4px solid #f5a623;">
                <tr><td style="padding: 16px; font-size: 15px; line-height: 1.6; color: #333333;">
                  ⚠️ <strong>Attention :</strong> nous ne sélectionnons qu'<strong>un seul agent par zone</strong>. Une fois votre secteur attribué, il ne sera plus proposé à un autre professionnel. Vérifiez rapidement si votre ville est encore disponible.
                </td></tr>
              </table>

              <p style="margin: 24px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                L'objectif est simple : <strong>vous aider à recevoir des opportunités vendeurs qualifiées</strong>, sans passer vos journées à chercher des particuliers à contacter. Vous gardez la partie commerciale terrain : l'appel, le rendez-vous, la signature du mandat et la vente.
              </p>

              <!-- CTAs -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 32px 0 16px;">
                <tr>
                  <td align="center">
                    <a href="https://maji-auto.fr/?utm_source=discountcg&utm_medium=email&utm_campaign=depot_vente_2026" class="cta-button" style="display: inline-block; padding: 16px 32px; background-color: #008CFF; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">👉 Je découvre MaJi Auto</a>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 16px;">
                <tr>
                  <td align="center">
                    <a href="https://maji-auto.fr/?utm_source=discountcg&utm_medium=email&utm_campaign=depot_vente_2026&cta=reserver" class="cta-button" style="display: inline-block; padding: 14px 28px; background-color: #ffffff; color: #008CFF; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: 600; border: 2px solid #008CFF;">📍 Réserver mon secteur</a>
                  </td>
                </tr>
              </table>

              <p style="margin: 32px 0 0; font-size: 16px; line-height: 1.6; color: #333333;">
                Une question ? Répondez simplement à cet e-mail ou écrivez-nous à <a href="mailto:contact@maji-auto.fr" style="color: #008CFF;">contact@maji-auto.fr</a>.
              </p>

              <p style="margin: 32px 0 0; font-size: 16px; line-height: 1.6; color: #333333;">
                À très vite,<br>
                <strong>L'équipe MaJi Auto</strong><br>
                <span style="font-size: 14px; color: #666;">Réseau de dépôt-vente automobile</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 24px 32px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 12px; font-size: 12px; color: #888888; line-height: 1.5;">
                Vous recevez cet e-mail en tant que professionnel inscrit sur DiscountCG.<br>
                <a href="mailto:contact@discountcartegrise.fr?subject=Désinscription%20MaJi%20Auto" style="color: #888888; text-decoration: underline;">Se désinscrire</a>
              </p>
              <p style="margin: 0; font-size: 12px; color: #aaaaaa;">
                MaJi Auto — Réseau de dépôt-vente automobile
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token') || req.headers.get('x-admin-token');
    if (token !== ADMIN_TOKEN) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const dryRun = url.searchParams.get('dry') === '1';
    const testEmail = url.searchParams.get('test');
    const startIdx = parseInt(url.searchParams.get('start') || '0', 10);
    const endIdx = url.searchParams.get('end') ? parseInt(url.searchParams.get('end')!, 10) : undefined;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data, error } = await supabase
      .from('garages')
      .select('email')
      .not('email', 'is', null);
    if (error) throw error;

    // Strict RFC-ish email validation; reject anything Resend would refuse
    const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;
    const set = new Set<string>();
    const rejected: string[] = [];
    for (const row of data || []) {
      const e = (row.email || '').trim().toLowerCase();
      if (!e) continue;
      if (EMAIL_RE.test(e) && e.length <= 254 && !e.includes('..')) {
        set.add(e);
      } else {
        rejected.push(e);
      }
    }
    let recipients = [...set]; // keep DB insertion order to match the first run's indices
    if (testEmail) recipients = [testEmail.toLowerCase()];
    if (endIdx !== undefined || startIdx > 0) {
      recipients = recipients.slice(startIdx, endIdx);
    }

    if (dryRun) {
      return new Response(JSON.stringify({ count: recipients.length, rejected_count: rejected.length, rejected_sample: rejected.slice(0, 10), sample: recipients.slice(0, 5) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const results: { sent: number; failed: number; errors: any[] } = { sent: 0, failed: 0, errors: [] };
    // Send one-by-one to avoid an invalid address poisoning a batch
    for (const to of recipients) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM,
          to: [to],
          reply_to: REPLY_TO,
          subject: SUBJECT,
          html: HTML_TEMPLATE,
        }),
      });
      if (!res.ok) {
        results.failed++;
        const j = await res.json().catch(() => ({}));
        results.errors.push({ to, status: res.status, body: j });
      } else {
        results.sent++;
      }
      // Resend free/standard limit: 2 req/s — wait 550ms
      await new Promise((r) => setTimeout(r, 550));
    }


    return new Response(JSON.stringify({ total: recipients.length, ...results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
