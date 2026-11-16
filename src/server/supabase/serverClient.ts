import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Supabase client acting as the signed-in visitor (reads their session cookies), so row-level
 * security applies to every query. Create a new one per request; never share it.
 * Returns null while Supabase isn't configured.
 */
export async function createServerSupabase(): Promise<SupabaseClient | null> {
  const env = getSupabaseEnv();
  if (!env) return null;
  const cookieStore = await cookies();
  // The session check reads the clock (token expiry), so it must run at request time, never in a prerender.
  await connection();

  return createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, which can't set cookies; src/proxy.ts refreshes the session instead.
        }
      },
    },
  });
}
