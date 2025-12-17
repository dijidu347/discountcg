import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
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

interface EmailRequest {
  type: 'order_complete' | 'document_rejected' | 'payment_confirmed' | 'account_verified' | 'account_rejected' | 'simple_message';
  orderId?: string;
  trackingNumber?: string;
  demarcheId?: string;
  email: string;
  customerName: string;
  immatriculation?: string;
  rejectedDocuments?: Array<{ nom: string; raison: string }>;
  montantTTC?: number;
  rejectionReason?: string;
  customSubject?: string;
  customMessage?: string;
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
    const emailData: EmailRequest = await req.json();
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let subject: string;
    let html: string;

    // Handle simple message type (no template, direct message)
    if (emailData.type === 'simple_message') {
      subject = emailData.customSubject || 'Message';
      html = `<div style="font-family: Arial, sans-serif;">${emailData.customMessage || ''}</div>`;
    } else {
      // Fetch template from database
      const { data: template, error: templateError } = await supabase
        .from('email_templates')
        .select('subject, html_content')
        .eq('type', emailData.type)
        .single();

      if (templateError) {
        console.error(`Template not found for type: ${emailData.type}`, templateError);
        throw new Error(`Email template not found: ${emailData.type}`);
      }

      // Prepare replacement data
      let replacements: Record<string, string> = {
        customerName: emailData.customerName,
        immatriculation: emailData.immatriculation || '',
        trackingNumber: emailData.trackingNumber || '',
        demarcheId: emailData.demarcheId || '',
        montantTTC: emailData.montantTTC?.toString() || '',
        rejectionReason: emailData.rejectionReason || '',
      };

      // Handle rejected documents list
      if (emailData.rejectedDocuments && emailData.rejectedDocuments.length > 0) {
        const docList = emailData.rejectedDocuments
          .map(doc => `<li><strong>${doc.nom}</strong>: ${doc.raison}</li>`)
          .join('');
        replacements.rejectedDocuments = docList;
      }

      // Replace placeholders in subject and html
      subject = template.subject;
      html = template.html_content;

      Object.entries(replacements).forEach(([key, value]) => {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(placeholder, value);
        html = html.replace(placeholder, value);
      });
    }

    console.log(`Sending email type: ${emailData.type} to ${emailData.email}`);

    const { data, error } = await resend.emails.send({
      from: "DiscountCarteGrise <noreply@discountcartegrise.fr>",
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
