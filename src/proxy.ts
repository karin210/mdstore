import { hasLocale } from "next-intl";
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { findPromptBySlug } from "@/data/prompts";
import { routing } from "@/i18n/routing";
import {
  isAdminRequest,
  postedPromptExists,
  postedPromptVisibleToRequest,
  postReviewVisibleToRequest,
} from "@/server/prompts/postedPromptExists";
import { refreshSupabaseSession } from "@/server/supabase/refreshSession";

const handleLocale = createMiddleware(routing);

/** Pages only a signed-in user has: everyone else is sent to /login, and back here afterwards. */
const ACCOUNT_PAGES = new Set(["profile", "my-prompts"]);

/**
 * Whether /prompts/[slug] has something to show this visitor: a catalogue listing, a public posted
 * prompt, or (for its author or an admin) a post still in review. Checked in that order, so the
 * session lookup only runs for slugs nobody can see publicly.
 */
async function promptExists(slug: string, request: NextRequest): Promise<boolean> {
  return (
    Boolean(findPromptBySlug(slug)) ||
    (await postedPromptExists(slug)) ||
    (await postedPromptVisibleToRequest(slug, request))
  );
}

/**
 * Whether a private page exists for this visitor: a post's review (its authors and the admins) or
 * the review queue (admins). Everyone else gets the same 404 as an unknown URL.
 */
async function privatePageExists(
  section: string | undefined,
  slug: string | undefined,
  more: string[],
  request: NextRequest,
): Promise<boolean> {
  if (section === "prompts" && slug !== undefined && more.length === 1 && more[0] === "review") {
    return postReviewVisibleToRequest(decodeURIComponent(slug), request);
  }
  if (section === "reviews" && slug === undefined) return isAdminRequest(request);
  return true;
}

/**
 * 1. Unknown prompt slugs go to the branded 404 with a real 404 status, and so do private pages
 *    (reviews, the review queue) for visitors who may not see them.
 *    The detail page streams, so its own `notFound()` can only answer 200 on the first request
 *    (see "Status codes" in the loading.js docs); checking here runs before rendering starts.
 * 2. Everything else goes through next-intl: it detects the browser language on the first visit,
 *    redirects to the right locale and remembers the choice in a cookie.
 * 3. The Supabase session is refreshed on that response, so signed-in users stay signed in
 *    (Server Components can't write the renewed cookies themselves).
 * 4. Signed-out visitors of the account pages (/profile, /my-prompts) are redirected to /login,
 *    which returns them to the page after signing in. A locale redirect from step 2 goes first, so
 *    the login page opens in the visitor's language.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const [first, ...rest] = request.nextUrl.pathname.split("/").filter(Boolean);
  const hasPrefix = first !== undefined && hasLocale(routing.locales, first);
  const locale = hasPrefix ? first : routing.defaultLocale;
  const [section, slug, ...more] = hasPrefix ? rest : [first, ...rest];

  if (
    (section === "prompts" &&
      slug !== undefined &&
      more.length === 0 &&
      !(await promptExists(decodeURIComponent(slug), request))) ||
    !(await privatePageExists(section, slug, more, request))
  ) {
    // Only the [...rest] catch-all matches this internal path, so the not-found page renders with a 404.
    return NextResponse.rewrite(new URL(`/${locale}/_unknown-prompt`, request.url));
  }
  const { response, is_signed_in } = await refreshSupabaseSession(request, handleLocale(request));
  if (section !== undefined && ACCOUNT_PAGES.has(section) && slug === undefined && !is_signed_in) {
    if (response.headers.has("location")) return response;
    // Built by hand: the locale-aware getPathname() can't run in the proxy. English has no prefix.
    const login_url = new URL(`${locale === routing.defaultLocale ? "" : `/${locale}`}/login`, request.url);
    login_url.searchParams.set("next", `/${section}`);
    return NextResponse.redirect(login_url);
  }
  return response;
}

export const config = {
  // Everything except API routes, Next.js internals and files with an extension (favicon, images).
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
