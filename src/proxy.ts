import { NextResponse, type NextRequest } from "next/server";
import { findPromptBySlug } from "@/data/prompts";

/**
 * Unknown listing slugs go to the branded 404 with a real 404 status.
 * The detail page streams, so its own `notFound()` can only answer 200 on the first request
 * (see "Status codes" in the loading.js docs); checking here runs before rendering starts.
 */
export function proxy(request: NextRequest): NextResponse {
  const slug = decodeURIComponent(request.nextUrl.pathname.split("/")[2] ?? "");

  if (!findPromptBySlug(slug)) {
    // No route matches this internal path, so the root not-found page renders with a 404.
    return NextResponse.rewrite(new URL("/_unknown-prompt", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // One segment only: /prompts/[slug]/download handles unknown slugs itself.
  matcher: "/prompts/:slug",
};
