import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { get_supabase_env } from "@/lib/supabase/env";

/**
 * Refreshes the visitor's Supabase session on every request (called from src/proxy.ts), writing
 * renewed auth cookies to both the request (for this render) and the response (for the browser).
 * Server Components can't set cookies, so without this the session would expire mid-visit.
 */
export async function refresh_supabase_session(request: NextRequest, response: NextResponse): Promise<NextResponse> {
  const env = get_supabase_env();
  if (!env) return response;

  const supabase = createServerClient(env.url, env.publishable_key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookies_to_set, headers) {
        cookies_to_set.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
        // Responses that set auth cookies must never be cached and served to someone else.
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Verifies the token and triggers the refresh; nothing may run between creating the client and this call.
  await supabase.auth.getClaims();
  return response;
}
