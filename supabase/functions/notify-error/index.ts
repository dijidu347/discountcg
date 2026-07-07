import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const ADMIN_EMAIL = "contact@discountcartegrise.fr";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { source, error, context } = await req.json();

    const contextRows = context
      ? Object.entries(context)
          .map(([k, v]) => `<tr><td style="padding:6px 12px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb">${k}</td><td style="padding:6px 12px;color:#6b7280;border-bottom:1px solid #e5e7eb">${v}</td></tr>`)
          .join("")
      : "";

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#ef4444;color:white;padding:16px 24px;border-radius:12px 12px 0 0">
          <h2 style="margin:0;font-size:18px">Erreur — ${source}</h2>
          <p style="margin:4px 0 0;font-size:13px;opacity:0.9">${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}</p>
        </div>
        <div style="background:#fef2f2;padding:20px 24px;border:1px solid #fecaca;border-top:none;border-radius:0 0 12px 12px">
          <p style="margin:0 0 12px;font-size:14px;color:#991b1b;font-weight:600">Message d'erreur :</p>
          <pre style="background:#1f2937;color:#f9fafb;padding:12px 16px;border-radius:8px;font-size:13px;overflow-x:auto;white-space:pre-wrap">${error}</pre>
          ${contextRows ? `
          <p style="margin:16px 0 8px;font-size:14px;color:#991b1b;font-weight:600">Contexte :</p>
          <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb">
            ${contextRows}
          </table>` : ""}
        </div>
      </div>`;

    const { error: sendError } = await resend.emails.send({
      from: "DiscountCarteGrise Alertes <noreply@discountcartegrise.fr>",
      to: ADMIN_EMAIL,
      subject: `[ERREUR] ${source} — ${error.substring(0, 80)}`,
      html,
    });

    if (sendError) {
      console.error("Failed to send error notification:", sendError);
      return new Response(JSON.stringify({ error: sendError }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("notify-error failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
