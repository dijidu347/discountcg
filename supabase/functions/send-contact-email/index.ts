import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactRequest {
  name: string;
  email: string;
  phone?: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, phone, message }: ContactRequest = await req.json();

    console.log(`📧 Contact form submission from ${name} (${email})`);

    // Envoyer l'email à l'équipe
    const emailResponse = await resend.emails.send({
      from: "DiscountCarteGrise <noreply@discountcartegrise.fr>",
      to: "contact@discountcartegrise.fr",
      reply_to: email,
      subject: `📬 Nouveau message de ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #3b82f6;">Nouveau message de contact</h1>
          
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 8px 0;"><strong>Nom :</strong> ${name}</p>
            <p style="margin: 8px 0;"><strong>Email :</strong> <a href="mailto:${email}">${email}</a></p>
            ${phone ? `<p style="margin: 8px 0;"><strong>Téléphone :</strong> ${phone}</p>` : ''}
          </div>

          <div style="background-color: #fff; border: 1px solid #e5e7eb; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Message :</h3>
            <p style="white-space: pre-wrap;">${message}</p>
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
      return new Response(
        JSON.stringify({ error: emailResponse.error.message || "Échec Resend", resend_error: emailResponse.error }),
        { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("✅ Contact email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("❌ Error in send-contact-email:", error);
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
