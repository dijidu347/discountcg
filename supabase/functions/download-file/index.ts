import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-tracking-number",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const bucket = url.searchParams.get("bucket");
    const path = url.searchParams.get("path");
    const trackingNumber = url.searchParams.get("tracking") || req.headers.get("x-tracking-number");

    if (!bucket || !path) {
      return new Response(JSON.stringify({ error: "Missing bucket or path" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`📁 Download request - bucket: ${bucket}, path: ${path}, tracking: ${trackingNumber}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify access for guest orders
    if (bucket === "guest-order-documents" && trackingNumber) {
      const { data: orderData } = await supabase
        .from("guest_orders")
        .select("id")
        .eq("tracking_number", trackingNumber)
        .single();

      if (!orderData) {
        console.error("❌ Order not found for tracking:", trackingNumber);
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Check if document belongs to this order
      const decodedPath = decodeURIComponent(path);
      const { data: docData } = await supabase
        .from("guest_order_admin_documents")
        .select("id")
        .eq("order_id", orderData.id)
        .limit(1);

      const { data: guestDocData } = await supabase
        .from("guest_order_documents")
        .select("id")
        .eq("order_id", orderData.id)
        .limit(1);

      if ((!docData || docData.length === 0) && (!guestDocData || guestDocData.length === 0)) {
        // Check if path contains the order ID (admin uploads are in orderId/admin_xxx format)
        if (!path.includes(orderData.id) && !decodedPath.includes(orderData.id)) {
          console.error("❌ Document not found for order");
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
      }
      
      console.log("✅ Guest authorized via tracking number");
    }

    // Download the file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(path);

    if (downloadError || !fileData) {
      console.error("❌ Download error:", downloadError);
      return new Response(JSON.stringify({ error: "File not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get filename from path
    const filename = path.split("/").pop() || "document";
    
    // Determine content type
    const ext = filename.split(".").pop()?.toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === "pdf") contentType = "application/pdf";
    else if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg";
    else if (ext === "png") contentType = "image/png";
    else if (ext === "webp") contentType = "image/webp";

    console.log("✅ File downloaded successfully:", filename);

    return new Response(fileData, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error: any) {
    console.error("❌ Error in download-file:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
