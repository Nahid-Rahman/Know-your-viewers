import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Admin-privileged Supabase client using the service role key — only for
 * `auth.admin.*` calls (creating/deleting a streamer's login on their
 * behalf). Never import this into anything that could reach the browser.
 */
export function createSupabaseAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
