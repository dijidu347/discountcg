import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Origines autorisées à appeler le formulaire de contact.
// Les aperçus Lovable sont acceptés pour ne pas casser les tests avant publication.
const ORIGINES_AUTORISEES = [
  "https://discountcartegrise.fr",
  "https://www.discountcartegrise.fr",
];
const MOTIFS_APERCU = [/^https:\/\/[a-z0-9-]+\.lovable\.app$/, /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/];

function originAutorisee(origin: string | null): boolean {
  if (!origin) return false;
  if (ORIGINES_AUTORISEES.includes(origin)) return true;
  return MOTIFS_APERCU.some((m) => m.test(origin));
}

function entetes(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": originAutorisee(origin) ? origin! : ORIGINES_AUTORISEES[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

// Neutralise le HTML : sans ça, un visiteur peut injecter des liens piégés
// dans l'email que lit l'équipe.
function echapper(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Limitation de débit par IP. Best effort : la mémoire n'est pas partagée entre
// instances, mais cela suffit à casser un envoi automatisé depuis une source unique.
const FENETRE_MS = 10 * 60 * 1000;
const MAX_PAR_FENETRE = 3;
const envois = new Map<string, number[]>();

function tropDEnvois(ip: string): boolean {
  const maintenant = Date.now();
  const recents = (envois.get(ip) ?? []).filter((t) => maintenant - t < FENETRE_MS);
  if (recents.length >= MAX_PAR_FENETRE) {
    envois.set(ip, recents);
    return true;
  }
  recents.push(maintenant);
  envois.set(ip, recents);
  if (envois.size > 5000) envois.clear(); // garde-fou mémoire
  return false;
}

const LIMITES = { name: 100, email: 200, phone: 30, message: 5000 };

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = entetes(origin);
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!originAutorisee(origin)) {
    console.warn("⛔ Origine refusée:", origin);
    return json(403, { error: "Origine non autorisée" });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "inconnue";
  if (tropDEnvois(ip)) {
    console.warn("⛔ Trop d'envois depuis", ip);
    return json(429, { error: "Trop de messages envoyés. Réessayez dans quelques minutes." });
  }

  try {
    const { name, email, phone, message } = await req.json();

    if (typeof name !== "string" || typeof email !== "string" || typeof message !== "string") {
      return json(400, { error: "Champs manquants" });
    }
    const nom = name.trim();
    const courriel = email.trim();
    const texte = message.trim();
    const tel = typeof phone === "string" ? phone.trim() : "";

    if (!nom || !courriel || !texte) {
      return json(400, { error: "Nom, email et message sont obligatoires" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(courriel)) {
      return json(400, { error: "Adresse email invalide" });
    }
    if (
      nom.length > LIMITES.name || courriel.length > LIMITES.email ||
      tel.length > LIMITES.phone || texte.length > LIMITES.message
    ) {
      return json(400, { error: "Un des champs dépasse la taille autorisée" });
    }

    console.log(`📧 Contact form submission from ${nom} (${courriel})`);

    const emailResponse = await resend.emails.send({
      from: "DiscountCarteGrise <noreply@discountcartegrise.fr>",
      to: "contact@discountcartegrise.fr",
      reply_to: courriel,
      subject: `📬 Nouveau message de ${nom.slice(0, 60)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #3b82f6;">Nouveau message de contact</h1>

          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 8px 0;"><strong>Nom :</strong> ${echapper(nom)}</p>
            <p style="margin: 8px 0;"><strong>Email :</strong> ${echapper(courriel)}</p>
            ${tel ? `<p style="margin: 8px 0;"><strong>Téléphone :</strong> ${echapper(tel)}</p>` : ''}
          </div>

          <div style="background-color: #fff; border: 1px solid #e5e7eb; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Message :</h3>
            <p style="white-space: pre-wrap;">${echapper(texte)}</p>
          </div>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px;">
            Cet email a été envoyé depuis le formulaire de contact de DiscountCarteGrise.fr
          </p>
        </div>
      `,
    });

    if (emailResponse.error) {
      console.error("❌ Resend a refusé l'envoi:", emailResponse.error);
      return json(502, { error: "Échec de l'envoi. Réessayez plus tard." });
    }

    console.log("✅ Contact email sent successfully");
    return json(200, { success: true });
  } catch (error: any) {
    console.error("❌ Error in send-contact-email:", error);
    return json(500, { error: "Erreur interne" });
  }
};

serve(handler);
