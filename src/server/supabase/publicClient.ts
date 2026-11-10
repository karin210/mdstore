import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { get_supabase_env } from "@/lib/supabase/env";

/**
 * Supabase client with no session, for public reads (posted prompts). It never touches cookies,
 * so it can run inside `"use cache"` functions. Returns null while Supabase isn't configured.
 */
export function create_public_supabase(): SupabaseClient | null {
  const env = get_supabase_env();
  if (!env) return null;

  return createClient(env.url, env.publishable_key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
