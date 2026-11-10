import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Supabase client with no session, for public reads (posted prompts). It never touches cookies,
 * so it can run inside `"use cache"` functions. Returns null while Supabase isn't configured.
 */
export function createPublicSupabase(): SupabaseClient | null {
  const env = getSupabaseEnv();
  if (!env) return null;

  return createClient(env.url, env.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
