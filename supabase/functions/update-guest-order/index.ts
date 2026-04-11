import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { orderId, ...updateFields } = await req.json();

    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Whitelist allowed fields to prevent injection
    const allowedFields = [
      "nom", "prenom", "email", "telephone", "adresse", "code_postal", "ville",
      "has_cotitulaire", "cotitulaire_nom", "cotitulaire_prenom",
      "vehicule_pro", "vehicule_leasing", "is_mineur", "is_heberge",
      "user_id", "updated_at",
    ];

    const safeUpdate: Record<string, any> = {};
    for (const key of allowedFields) {
      if (key in updateFields) {
        safeUpdate[key] = updateFields[key];
      }
    }

    if (Object.keys(safeUpdate).length === 0) {
      return new Response(JSON.stringify({ error: "No valid fields to update" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    safeUpdate.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("guest_orders")
      .update(safeUpdate)
      .eq("id", orderId)
      .select("id, email, nom, prenom")
      .single();

    if (error) {
      console.error("❌ Update failed:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("✅ Guest order updated via edge function:", data?.id);

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("❌ Edge function error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
