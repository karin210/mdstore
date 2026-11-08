import { hasLocale } from "next-intl";
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { findPromptBySlug } from "@/data/prompts";
import { routing } from "@/i18n/routing";

const handleLocale = createMiddleware(routing);

/**
 * 1. Unknown listing slugs go to the branded 404 with a real 404 status.
 *    The detail page streams, so its own `notFound()` can only answer 200 on the first request
 *    (see "Status codes" in the loading.js docs); checking here runs before rendering starts.
 * 2. Everything else goes through next-intl: it detects the browser language on the first visit,
 *    redirects to the right locale and remembers the choice in a cookie.
 */
export function proxy(request: NextRequest): NextResponse {
  const [first, ...rest] = request.nextUrl.pathname.split("/").filter(Boolean);
  const hasPrefix = first !== undefined && hasLocale(routing.locales, first);
  const locale = hasPrefix ? first : routing.defaultLocale;
  const [section, slug, ...more] = hasPrefix ? rest : [first, ...rest];

  if (section === "prompts" && slug !== undefined && more.length === 0 && !findPromptBySlug(decodeURIComponent(slug))) {
    // Only the [...rest] catch-all matches this internal path, so the not-found page renders with a 404.
    return NextResponse.rewrite(new URL(`/${locale}/_unknown-prompt`, request.url));
  }
  return handleLocale(request);
}

export const config = {
  // Everything except API routes, Next.js internals and files with an extension (favicon, images).
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
