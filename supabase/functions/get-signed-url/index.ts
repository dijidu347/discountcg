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
  trackingNumber?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get headers
    const authHeader = req.headers.get("authorization");
    const trackingNumber = req.headers.get("x-tracking-number");
    
    // ROBUST BODY PARSING: Read raw text first, then parse
    let requestBody: SignedUrlRequest;
    try {
      const rawBody = await req.text();
      console.log("📥 Raw body received:", rawBody);
      console.log("📥 Body type:", typeof rawBody);
      console.log("📥 Body length:", rawBody.length);
      
      // Handle empty body
      if (!rawBody || rawBody.trim() === "") {
        console.error("❌ Empty body received");
        return new Response(
          JSON.stringify({ error: "Request body is required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      // Handle "[object Object]" string (malformed serialization)
      if (rawBody === "[object Object]") {
        console.error("❌ Received [object Object] string - client serialization issue");
        return new Response(
          JSON.stringify({ error: "Invalid request body: received [object Object]" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      // Try to parse JSON
      const parsed = JSON.parse(rawBody);
      
      // Handle double-stringified JSON (e.g., '"{\"bucket\":...}"')
      if (typeof parsed === "string") {
        console.log("📥 Body was double-stringified, parsing again...");
        requestBody = JSON.parse(parsed);
      } else {
        requestBody = parsed;
      }
      
      console.log("✅ Parsed body:", JSON.stringify(requestBody));
    } catch (parseError) {
      console.error("❌ JSON parsing error:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    const { bucket, path, trackingNumber: bodyTrackingNumber } = requestBody;
    const effectiveTrackingNumber = trackingNumber || bodyTrackingNumber;

    // Validate required fields
    if (!bucket || !path) {
      console.error("❌ Missing bucket or path:", { bucket, path });
      return new Response(
        JSON.stringify({ error: "bucket and path are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`📁 Signed URL request - bucket: "${bucket}", path: "${path}"`);

    // Check authorization
    let isAuthorized = false;
    let userId: string | null = null;

    // Check if user is authenticated
    if (authHeader) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
      const userSupabase = createClient(supabaseUrl, anonKey || supabaseServiceKey, {
        global: { headers: { Authorization: authHeader } }
      });
      
      const { data: { user }, error: userError } = await userSupabase.auth.getUser();
      
      if (user && !userError) {
        userId = user.id;
        
        // Check if user is admin
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .single();
        
        if (roleData) {
          isAuthorized = true;
          console.log("✅ Admin user authorized");
        }

        // Check if user owns the garage (for demarche-documents or factures)
        if (!isAuthorized && (bucket === "demarche-documents" || bucket === "factures")) {
          const { data: garageData } = await supabase
            .from("garages")
            .select("id")
            .eq("user_id", user.id)
            .single();
          
          if (garageData) {
            isAuthorized = true;
            console.log("✅ Garage owner authorized for bucket:", bucket);
          }
        }
      } else {
        console.log("⚠️ Could not get user from token:", userError?.message);
      }
    }

    // For guest-order-documents, allow access with tracking number
    if (!isAuthorized && bucket === "guest-order-documents" && effectiveTrackingNumber) {
      const { data: orderData } = await supabase
        .from("guest_orders")
        .select("id")
        .eq("tracking_number", effectiveTrackingNumber)
        .single();
      
      if (orderData) {
        // Check if the document belongs to this order (check guest_order_documents)
        const { data: docData } = await supabase
          .from("guest_order_documents")
          .select("id")
          .eq("order_id", orderData.id)
          .ilike("url", `%${path}%`)
          .single();
        
        if (docData) {
          isAuthorized = true;
          console.log("✅ Guest order document authorized via tracking number");
        }
        
        // Also check admin documents
        if (!isAuthorized) {
          const { data: adminDocData } = await supabase
            .from("guest_order_admin_documents")
            .select("id")
            .eq("order_id", orderData.id)
            .ilike("url", `%${path}%`)
            .single();
          
          if (adminDocData) {
            isAuthorized = true;
            console.log("✅ Admin document authorized via tracking number");
          }
        }
        
        // Fallback: if path starts with order ID, authorize
        if (!isAuthorized && path.startsWith(orderData.id)) {
          isAuthorized = true;
          console.log("✅ Document authorized - path starts with order ID");
        }
      }
    }

    // For factures bucket with tracking number
    if (!isAuthorized && bucket === "factures" && effectiveTrackingNumber) {
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

    if (!isAuthorized) {
      console.error("❌ Unauthorized access attempt - bucket:", bucket, "path:", path);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate signed URL (valid for 1 hour)
    console.log(`🔐 Creating signed URL for bucket: "${bucket}", path: "${path}"`);
    
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600);

    if (signedUrlError) {
      console.error("❌ Error creating signed URL:", signedUrlError);
      return new Response(
        JSON.stringify({ error: `Storage error: ${signedUrlError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!signedUrlData?.signedUrl) {
      console.error("❌ No signed URL returned");
      return new Response(
        JSON.stringify({ error: "Failed to generate signed URL" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("✅ Signed URL created successfully");

    return new Response(
      JSON.stringify({ signedUrl: signedUrlData.signedUrl }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("❌ Unhandled error in get-signed-url:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
