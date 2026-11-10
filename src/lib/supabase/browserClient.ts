import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Supabase client for Client Components (the browser reuses one instance internally).
 * Returns null while Supabase isn't configured, so the UI can fall back to its signed-out state.
 */
export function createBrowserSupabase(): SupabaseClient | null {
  const env = getSupabaseEnv();
  if (!env) return null;
  return createBrowserClient(env.url, env.publishableKey);
}
