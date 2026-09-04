import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { brokeredPreviewStorage } from './previewAuthStorage';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://oiotlgkfwuwshpwraneb.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pb3RsZ2tmd3V3c2hwd3JhbmViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MjA0MDMsImV4cCI6MjA3ODA5NjQwM30.r212hPDwbLcKCL6K8B8RIW8Un6ubW71ydk-nNG7qjiE";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: brokeredPreviewStorage(),
    persistSession: true,
    autoRefreshToken: true,
  }
});