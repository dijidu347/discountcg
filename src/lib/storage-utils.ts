import { supabase } from "@/integrations/supabase/client";

// Valid bucket names
export type StorageBucket = "demarche-documents" | "guest-order-documents" | "factures";

const VALID_BUCKETS: StorageBucket[] = ["demarche-documents", "guest-order-documents", "factures"];

/**
 * Get a signed URL for a file in a private storage bucket
 * @param bucket - The storage bucket name (must be one of the valid buckets)
 * @param path - The file path within the bucket (e.g., "garage_id/file.pdf")
 * @param trackingNumber - Optional tracking number for guest order access
 * @returns The signed URL or null if failed
 */
export const getSignedUrl = async (
  bucket: StorageBucket,
  path: string,
  trackingNumber?: string
): Promise<string | null> => {
  try {
    // Validate bucket
    if (!VALID_BUCKETS.includes(bucket)) {
      console.error("Invalid bucket:", bucket);
      return null;
    }

    // Clean the path - remove any leading slashes or bucket prefix
    let cleanPath = path;
    
    // Remove leading slashes
    cleanPath = cleanPath.replace(/^\/+/, "");
    
    // Remove bucket prefix if present
    if (cleanPath.startsWith(`${bucket}/`)) {
      cleanPath = cleanPath.slice(bucket.length + 1);
    }
    
    // Remove query params
    cleanPath = cleanPath.split("?")[0];

    console.log(`📤 Requesting signed URL - bucket: "${bucket}", path: "${cleanPath}"`);

    // Get the current session for JWT
    const { data: { session } } = await supabase.auth.getSession();
    
    const headers: Record<string, string> = {};
    
    // Add JWT if authenticated
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
    
    // Add tracking number header if provided
    if (trackingNumber) {
      headers["x-tracking-number"] = trackingNumber;
    }
    
    // Call edge function with explicit JSON body
    const response = await supabase.functions.invoke("get-signed-url", {
      body: { bucket, path: cleanPath, trackingNumber },
      headers,
    });
    
    if (response.error) {
      console.error("Error getting signed URL:", response.error);
      return null;
    }
    
    const signedUrl = response.data?.signedUrl;
    
    if (!signedUrl) {
      console.error("No signedUrl in response:", response.data);
      return null;
    }
    
    console.log("✅ Got signed URL successfully");
    return signedUrl;
  } catch (error) {
    console.error("Error in getSignedUrl:", error);
    return null;
  }
};

/**
 * Extract the bucket name from a storage URL or path
 * @param url - The URL or path (e.g., "factures/garage_id/file.pdf" or full Supabase URL)
 * @returns The bucket name or null if not found
 */
export const extractBucketFromUrl = (url: string): StorageBucket | null => {
  if (!url) return null;
  
  const trimmed = url.replace(/^\/+/, "");

  for (const bucket of VALID_BUCKETS) {
    // Check direct prefix: "bucket/path"
    if (trimmed.startsWith(`${bucket}/`)) return bucket;
    // Check URL contains bucket segment
    if (trimmed.includes(`/${bucket}/`)) return bucket;
  }

  return null;
};

/**
 * Extract the file path from a storage URL (removes bucket prefix and query params)
 * @param url - The URL or path
 * @returns The clean file path within the bucket
 */
export const extractPathFromUrl = (url: string): string => {
  if (!url) return "";
  
  let cleanUrl = url.replace(/^\/+/, "");
  
  // Handle full Supabase storage URLs
  // Format: https://xxx.supabase.co/storage/v1/object/public/bucket/path
  // Format: https://xxx.supabase.co/storage/v1/object/sign/bucket/path?token=xxx
  const storageMatch = cleanUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?|$)/);
  if (storageMatch) {
    return decodeURIComponent(storageMatch[2].split("?")[0]);
  }

  // Handle "bucket/path" format - remove bucket prefix
  for (const bucket of VALID_BUCKETS) {
    if (cleanUrl.startsWith(`${bucket}/`)) {
      return cleanUrl.slice(bucket.length + 1).split("?")[0];
    }
  }

  // Fallback: find bucket in path segments
  const parts = cleanUrl.split("/");
  const bucketIndex = parts.findIndex((p) => VALID_BUCKETS.includes(p as StorageBucket));

  if (bucketIndex !== -1 && bucketIndex < parts.length - 1) {
    return parts.slice(bucketIndex + 1).join("/").split("?")[0];
  }

  // Return as-is (might already be just the path)
  return cleanUrl.split("?")[0];
};

/**
 * Download a file from a signed URL as a real browser download
 */
export const downloadFromSignedUrl = async (signedUrl: string, filename: string): Promise<void> => {
  if (!signedUrl || signedUrl === "null" || signedUrl === "undefined") {
    console.error("Invalid signed URL:", signedUrl);
    throw new Error("URL de téléchargement invalide");
  }

  console.log("📥 Downloading:", filename);

  // Method 1: Try direct link click (works for same-origin or CORS-enabled)
  const link = document.createElement("a");
  link.href = signedUrl;
  link.download = filename;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  
  // For cross-origin URLs, we need to fetch and create blob
  try {
    const res = await fetch(signedUrl, { mode: "cors" });
    
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 0) {
        const blobUrl = URL.createObjectURL(blob);
        link.href = blobUrl;
        link.target = "_self";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        console.log("✅ Downloaded via blob");
        return;
      }
    }
  } catch (e) {
    console.log("Fetch failed, trying direct link:", e);
  }

  // Fallback: Direct link (browser will handle the download)
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  console.log("✅ Downloaded via direct link");
};

/**
 * Download a file from a private bucket using signed URL
 * @param bucket - The bucket name
 * @param path - The file path within the bucket
 * @param filename - The filename for the download
 * @param trackingNumber - Optional tracking number for guest access
 */
export const downloadPrivateFile = async (
  bucket: StorageBucket,
  path: string,
  filename: string,
  trackingNumber?: string
): Promise<void> => {
  const signedUrl = await getSignedUrl(bucket, path, trackingNumber);

  if (signedUrl) {
    await downloadFromSignedUrl(signedUrl, filename);
  } else {
    console.error("Failed to get signed URL for download");
    throw new Error("Impossible de télécharger le fichier");
  }
};

/**
 * Legacy function: Download using URL that contains bucket info
 * Extracts bucket and path from URL, then downloads
 */
export const downloadPrivateFileFromUrl = async (
  url: string,
  filename: string,
  trackingNumber?: string
): Promise<void> => {
  const bucket = extractBucketFromUrl(url);
  
  if (!bucket) {
    console.error("Could not determine bucket from URL:", url);
    throw new Error("Bucket non reconnu");
  }
  
  const path = extractPathFromUrl(url);
  
  if (!path) {
    console.error("Could not extract path from URL:", url);
    throw new Error("Chemin du fichier invalide");
  }
  
  await downloadPrivateFile(bucket, path, filename, trackingNumber);
};
