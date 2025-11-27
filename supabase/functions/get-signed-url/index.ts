import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-tracking-number",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface SignedUrlRequest {
  bucket: string;
  path: string;
  trackingNumber?: string; // For guest order document access
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get authorization header
    const authHeader = req.headers.get("authorization");
    const trackingNumber = req.headers.get("x-tracking-number");
    
    const { bucket, path, trackingNumber: bodyTrackingNumber }: SignedUrlRequest = await req.json();
    const effectiveTrackingNumber = trackingNumber || bodyTrackingNumber;

    console.log(`📁 Signed URL request for bucket: ${bucket}, path: ${path}`);

    // Check authorization
    let isAuthorized = false;
    let isAdmin = false;

    // Check if user is authenticated and is admin
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (user && !userError) {
        // Check if user is admin
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .single();
        
        if (roleData) {
          isAdmin = true;
          isAuthorized = true;
          console.log("✅ Admin user authorized");
        }

        // Check if user owns the garage (for demarche-documents)
        if (!isAuthorized && bucket === "demarche-documents") {
          const { data: garageData } = await supabase
            .from("garages")
            .select("id")
            .eq("user_id", user.id)
            .single();
          
          if (garageData) {
            isAuthorized = true;
            console.log("✅ Garage owner authorized");
          }
        }
      }
    }

    // For guest-order-documents, allow access with tracking number
    if (!isAuthorized && bucket === "guest-order-documents" && effectiveTrackingNumber) {
      // Verify the tracking number exists and matches the document's order
      const { data: orderData, error: orderError } = await supabase
        .from("guest_orders")
        .select("id")
        .eq("tracking_number", effectiveTrackingNumber)
        .single();
      
      if (orderData && !orderError) {
        // Check if the document belongs to this order
        const { data: docData } = await supabase
          .from("guest_order_documents")
          .select("id")
          .eq("order_id", orderData.id)
          .ilike("url", `%${path}%`)
          .single();
        
        if (docData) {
          isAuthorized = true;
          console.log("✅ Guest order owner authorized via tracking number");
        }
      }
    }

    // For admin documents (guest_order_admin_documents), allow with tracking number
    if (!isAuthorized && bucket === "guest-order-documents" && effectiveTrackingNumber) {
      const { data: orderData } = await supabase
        .from("guest_orders")
        .select("id")
        .eq("tracking_number", effectiveTrackingNumber)
        .single();
      
      if (orderData) {
        // Check both encoded and decoded versions of the path
        const encodedPath = encodeURIComponent(path).replace(/%2F/g, '/');
        const decodedPath = decodeURIComponent(path);
        
        // First try with the path as-is
        let { data: adminDocData } = await supabase
          .from("guest_order_admin_documents")
          .select("id")
          .eq("order_id", orderData.id)
          .or(`url.ilike.%${path}%,url.ilike.%${encodedPath}%,url.ilike.%${decodedPath}%`)
          .limit(1)
          .single();
        
        // If not found, try checking if the file path starts with the order ID (admin docs are in orderId/admin_xxx format)
        if (!adminDocData && path.startsWith(orderData.id)) {
          const { data: anyAdminDoc } = await supabase
            .from("guest_order_admin_documents")
            .select("id")
            .eq("order_id", orderData.id)
            .limit(1)
            .single();
          
          if (anyAdminDoc) {
            adminDocData = anyAdminDoc;
          }
        }
        
        if (adminDocData) {
          isAuthorized = true;
          console.log("✅ Admin document access authorized via tracking number");
        }
      }
    }

    // For factures bucket
    if (!isAuthorized && bucket === "factures") {
      // Admins already handled above
      // For guests, check if they have a tracking number for this invoice
      if (effectiveTrackingNumber) {
        const { data: orderData } = await supabase
          .from("guest_orders")
          .select("id")
          .eq("tracking_number", effectiveTrackingNumber)
          .single();
        
        if (orderData) {
          const { data: factureData } = await supabase
            .from("factures")
            .select("id")
            .eq("guest_order_id", orderData.id)
            .ilike("pdf_url", `%${path}%`)
            .single();
          
          if (factureData) {
            isAuthorized = true;
            console.log("✅ Facture access authorized via tracking number");
          }
        }
      }
    }

    if (!isAuthorized) {
      console.error("❌ Unauthorized access attempt");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate signed URL (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600);

    if (signedUrlError) {
      console.error("❌ Error creating signed URL:", signedUrlError);
      throw signedUrlError;
    }

    console.log("✅ Signed URL created successfully");

    return new Response(
      JSON.stringify({ signedUrl: signedUrlData.signedUrl }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("❌ Error in get-signed-url:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
