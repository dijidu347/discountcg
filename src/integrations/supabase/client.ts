import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://aqkqlgzzqvlxtlavooai.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxa3FsZ3p6cXZseHRsYXZvb2FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3ODAzMTksImV4cCI6MjA4NzM1NjMxOX0.IwO5ICZcn1gCdm5KuJRG-GeNieQuDblLAhwvxVb0hl8";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});