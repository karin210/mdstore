import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

/** Supabase names its auth cookies `sb-<project>-auth-token`; a visitor without one has no session. */
const SUPABASE_COOKIE_PREFIX = "sb-";

/**
 * A Supabase client acting as the visitor of a proxy request, built from that request's cookies,
 * so row-level security applies to its queries. For src/proxy.ts only, where `next/headers`
 * cookies aren't the request being handled. It never writes cookies: the session refresh in
 * refreshSession.ts owns that. Returns null while Supabase isn't configured or when the request
 * carries no Supabase cookie (nobody signed in, so there is nothing to look up).
 */
export function createRequestSupabase(request: NextRequest): SupabaseClient | null {
  const env = getSupabaseEnv();
  if (!env) return null;
  if (!request.cookies.getAll().some((cookie) => cookie.name.startsWith(SUPABASE_COOKIE_PREFIX))) return null;

  return createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        // Intentionally empty: this client only reads.
      },
    },
  });
}
