import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

export interface RefreshedSession {
  response: NextResponse;
  /** Whether the request carries a valid session, so the proxy can gate the account pages. */
  is_signed_in: boolean;
}

/**
 * Refreshes the visitor's Supabase session on every request (called from src/proxy.ts), writing
 * renewed auth cookies to both the request (for this render) and the response (for the browser).
 * Server Components can't set cookies, so without this the session would expire mid-visit.
 */
export async function refreshSupabaseSession(request: NextRequest, response: NextResponse): Promise<RefreshedSession> {
  const env = getSupabaseEnv();
  if (!env) return { response, is_signed_in: false };

  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
        // Responses that set auth cookies must never be cached and served to someone else.
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Verifies the token and triggers the refresh; nothing may run between creating the client and this call.
  const { data, error } = await supabase.auth.getClaims();
  return { response, is_signed_in: !error && Boolean(data) };
}
