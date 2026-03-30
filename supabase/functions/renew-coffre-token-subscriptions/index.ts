import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COFFRE_MONTHLY_PRICE = 9.99;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify cron secret to prevent unauthorized calls
  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get expired token subscriptions
    const { data: subs, error } = await supabase
      .from("coffre_subscriptions")
      .select("id, garage_id, current_period_end, cancel_at_period_end")
      .eq("payment_mode", "tokens")
      .eq("status", "active")
      .lt("current_period_end", new Date().toISOString());

    if (error) throw error;

    const results = { renewed: 0, past_due: 0, canceled: 0 };

    for (const sub of subs || []) {
      // If set to cancel, mark as canceled
      if (sub.cancel_at_period_end) {
        await supabase.from("coffre_subscriptions").update({ status: "canceled" }).eq("id", sub.id);
        results.canceled++;
        continue;
      }

      // Get garage token balance
      const { data: garage } = await supabase
        .from("garages")
        .select("token_balance")
        .eq("id", sub.garage_id)
        .single();

      const balance = Number(garage?.token_balance) || 0;

      if (balance < COFFRE_MONTHLY_PRICE) {
        // Insufficient → past_due
        await supabase.from("coffre_subscriptions").update({ status: "past_due" }).eq("id", sub.id);
        results.past_due++;
        console.log(`Coffre past_due for garage ${sub.garage_id} — balance: ${balance}€`);
      } else {
        // Deduct and renew
        await supabase.from("garages").update({ token_balance: balance - COFFRE_MONTHLY_PRICE }).eq("id", sub.garage_id);
        const prevEnd = sub.current_period_end ? new Date(sub.current_period_end) : new Date();
        const newEnd = new Date(prevEnd);
        newEnd.setDate(newEnd.getDate() + 30);
        await supabase.from("coffre_subscriptions").update({
          current_period_start: prevEnd.toISOString(),
          current_period_end: newEnd.toISOString(),
        }).eq("id", sub.id);
        results.renewed++;
        console.log(`Coffre renewed for garage ${sub.garage_id}. New period end: ${newEnd.toISOString()}`);
      }
    }

    return new Response(JSON.stringify({ success: true, processed: subs?.length || 0, ...results }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in renew-coffre-token-subscriptions:", error);
    return new Response(JSON.stringify({ error: "Erreur interne" }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
