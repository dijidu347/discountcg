import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, tracking_number, order_id, content, sender_email } =
      await req.json();

    if (!tracking_number || !order_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate tracking number format
    const trackingRegex = /^TRK-[A-Z0-9]{8}$/;
    if (!trackingRegex.test(tracking_number)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid tracking number" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the order exists and tracking_number matches the order_id
    const { data: order, error: orderError } = await supabase
      .from("guest_orders")
      .select("id, tracking_number, email, nom, prenom")
      .eq("id", order_id)
      .eq("tracking_number", tracking_number)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ success: false, error: "Order not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "get") {
      // Get messages for this order
      const { data: messages, error: msgError } = await supabase
        .from("guest_order_messages")
        .select("*")
        .eq("order_id", order_id)
        .order("created_at", { ascending: true });

      if (msgError) {
        console.error("Error fetching messages:", msgError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to load messages" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Mark admin messages as read (client is viewing them)
      const unreadAdminMsgIds = (messages || [])
        .filter((m: any) => m.sender_type === "admin" && !m.is_read)
        .map((m: any) => m.id);

      if (unreadAdminMsgIds.length > 0) {
        await supabase
          .from("guest_order_messages")
          .update({ is_read: true })
          .in("id", unreadAdminMsgIds);
      }

      return new Response(
        JSON.stringify({ success: true, messages: messages || [] }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "send") {
      if (!content || typeof content !== "string" || !content.trim()) {
        return new Response(
          JSON.stringify({ success: false, error: "Message content required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Insert message
      const { data: message, error: insertError } = await supabase
        .from("guest_order_messages")
        .insert({
          order_id,
          sender_type: "client",
          sender_email: sender_email || order.email,
          content: content.trim(),
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error inserting message:", insertError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to send message" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Send email notification to admin
      try {
        await supabase.functions.invoke("send-email", {
          body: {
            type: "admin_guest_message",
            to: "contact@discountcartegrise.fr",
            data: {
              client_name: `${order.prenom} ${order.nom}`,
              client_email: order.email,
              tracking_number: order.tracking_number,
              message_preview: content.trim().substring(0, 200),
            },
          },
        });
      } catch (e) {
        console.error("Email notification failed:", e);
      }

      return new Response(
        JSON.stringify({ success: true, message }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid action" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in guest-order-message:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
