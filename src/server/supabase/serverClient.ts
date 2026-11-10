import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { get_supabase_env } from "@/lib/supabase/env";

/**
 * Supabase client acting as the signed-in visitor (reads their session cookies), so row-level
 * security applies to every query. Create a new one per request; never share it.
 * Returns null while Supabase isn't configured.
 */
export async function create_server_supabase(): Promise<SupabaseClient | null> {
  const env = get_supabase_env();
  if (!env) return null;
  const cookie_store = await cookies();

  return createServerClient(env.url, env.publishable_key, {
    cookies: {
      getAll() {
        return cookie_store.getAll();
      },
      setAll(cookies_to_set) {
        try {
          cookies_to_set.forEach(({ name, value, options }) => cookie_store.set(name, value, options));
        } catch {
          // Called from a Server Component, which can't set cookies; src/proxy.ts refreshes the session instead.
        }
      },
    },
  });
}
