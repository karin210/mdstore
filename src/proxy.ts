import { hasLocale } from "next-intl";
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { findPromptBySlug } from "@/data/prompts";
import { routing } from "@/i18n/routing";
import { posted_prompt_exists } from "@/server/prompts/postedPromptExists";
import { refresh_supabase_session } from "@/server/supabase/refreshSession";

const handleLocale = createMiddleware(routing);

/** Whether /prompts/[slug] has something to show: a catalogue listing or a posted prompt. */
async function prompt_exists(slug: string): Promise<boolean> {
  return Boolean(findPromptBySlug(slug)) || (await posted_prompt_exists(slug));
}

/**
 * 1. Unknown prompt slugs go to the branded 404 with a real 404 status.
 *    The detail page streams, so its own `notFound()` can only answer 200 on the first request
 *    (see "Status codes" in the loading.js docs); checking here runs before rendering starts.
 * 2. Everything else goes through next-intl: it detects the browser language on the first visit,
 *    redirects to the right locale and remembers the choice in a cookie.
 * 3. The Supabase session is refreshed on that response, so signed-in users stay signed in
 *    (Server Components can't write the renewed cookies themselves).
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const [first, ...rest] = request.nextUrl.pathname.split("/").filter(Boolean);
  const hasPrefix = first !== undefined && hasLocale(routing.locales, first);
  const locale = hasPrefix ? first : routing.defaultLocale;
  const [section, slug, ...more] = hasPrefix ? rest : [first, ...rest];

  if (section === "prompts" && slug !== undefined && more.length === 0 && !(await prompt_exists(decodeURIComponent(slug)))) {
    // Only the [...rest] catch-all matches this internal path, so the not-found page renders with a 404.
    return NextResponse.rewrite(new URL(`/${locale}/_unknown-prompt`, request.url));
  }
  return refresh_supabase_session(request, handleLocale(request));
}

export const config = {
  // Everything except API routes, Next.js internals and files with an extension (favicon, images).
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
