import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { get_supabase_env } from "@/lib/supabase/env";

/**
 * Supabase client for Client Components (the browser reuses one instance internally).
 * Returns null while Supabase isn't configured, so the UI can fall back to its signed-out state.
 */
export function create_browser_supabase(): SupabaseClient | null {
  const env = get_supabase_env();
  if (!env) return null;
  return createBrowserClient(env.url, env.publishable_key);
}
