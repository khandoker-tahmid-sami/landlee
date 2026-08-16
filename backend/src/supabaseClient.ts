import { createClient } from "@supabase/supabase-js";
import { config } from "./config.js";

// Service-role client: bypasses RLS. Only used server-side, and every query
// here must be scoped by user_id explicitly (the auth middleware supplies it).
export const supabaseAdmin = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
