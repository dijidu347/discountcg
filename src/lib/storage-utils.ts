import { supabase } from "@/integrations/supabase/client";

/**
 * Get a signed URL for a file in a private storage bucket
 * @param bucket - The storage bucket name
 * @param path - The file path within the bucket
 * @param trackingNumber - Optional tracking number for guest order access
 * @returns The signed URL or null if failed
 */
export const getSignedUrl = async (
  bucket: string,
  path: string,
  trackingNumber?: string
): Promise<string | null> => {
  try {
    // Get the current session for JWT
    const { data: { session } } = await supabase.auth.getSession();
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    // Add JWT if authenticated
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
    
    // Add tracking number header if provided
    if (trackingNumber) {
      headers["x-tracking-number"] = trackingNumber;
    }
    
    const { data, error } = await supabase.functions.invoke("get-signed-url", {
      body: { bucket, path, trackingNumber },
      headers,
    });
    
    if (error) {
      console.error("Error getting signed URL:", error);
      return null;
    }
    
    return data?.signedUrl || null;
  } catch (error) {
    console.error("Error in getSignedUrl:", error);
    return null;
  }
};

/**
 * Extract the file path from a full Supabase storage URL
 * @param url - The full storage URL
 * @returns The file path within the bucket
 */
export const extractPathFromUrl = (url: string): string => {
  // URL format: https://xxx.supabase.co/storage/v1/object/public/bucket-name/path/to/file
  // or: https://xxx.supabase.co/storage/v1/object/sign/bucket-name/path/to/file?token=xxx
  const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/[^/]+\/(.+?)(?:\?|$)/);
  if (match) {
    return decodeURIComponent(match[1]);
  }
  
  // Fallback: try to get everything after the bucket name
  const parts = url.split("/");
  const bucketIndex = parts.findIndex(p => 
    p === "demarche-documents" || 
    p === "guest-order-documents" || 
    p === "factures"
  );
  
  if (bucketIndex !== -1 && bucketIndex < parts.length - 1) {
    return parts.slice(bucketIndex + 1).join("/").split("?")[0];
  }
  
  return url;
};

/**
 * Extract the bucket name from a full Supabase storage URL
 * @param url - The full storage URL
 * @returns The bucket name
 */
export const extractBucketFromUrl = (url: string): string | null => {
  const buckets = ["demarche-documents", "guest-order-documents", "factures"];
  
  for (const bucket of buckets) {
    if (url.includes(`/${bucket}/`)) {
      return bucket;
    }
  }
  
  return null;
};

/**
 * Download a file from a signed URL as a real browser download (works better on iOS Safari)
 */
export const downloadFromSignedUrl = async (signedUrl: string, filename: string): Promise<void> => {
  try {
    const res = await fetch(signedUrl);
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);

    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // cleanup
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch (e) {
    console.error("downloadFromSignedUrl failed, fallback to open:", e);
    window.open(signedUrl, "_blank");
  }
};

/**
 * Download a file from a private bucket
 * @param url - The original storage URL
 * @param filename - The filename to use for download
 * @param trackingNumber - Optional tracking number for guest order access
 */
export const downloadPrivateFile = async (
  url: string,
  filename: string,
  trackingNumber?: string
): Promise<void> => {
  const bucket = extractBucketFromUrl(url);
  const path = extractPathFromUrl(url);

  if (!bucket) {
    console.error("Could not determine bucket from URL:", url);
    // Fallback to direct open
    window.open(url, "_blank");
    return;
  }

  const signedUrl = await getSignedUrl(bucket, path, trackingNumber);

  if (signedUrl) {
    await downloadFromSignedUrl(signedUrl, filename);
  } else {
    console.error("Failed to get signed URL for download");
    // Fallback to direct open
    window.open(url, "_blank");
  }
};
