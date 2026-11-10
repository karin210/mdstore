import type { EmailOtpType } from "@supabase/supabase-js";
import { hasLocale } from "next-intl";
import { NextResponse, type NextRequest } from "next/server";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getSafeRedirectPath } from "@/lib/safeRedirect";
import { logServerError } from "@/server/logServerError";
import { createServerSupabase } from "@/server/supabase/serverClient";

const EMAIL_OTP_TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return EMAIL_OTP_TYPES.includes(value as EmailOtpType);
}

/**
 * Landing point of the confirmation email. Accepts both link formats Supabase can send:
 * `?tokenHash=…&type=…` (custom email template) and `?code=…` (default PKCE link).
 * On success the session starts and the user goes to the validated `next` path; on failure,
 * to the login page with a message.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/[locale]/auth/confirm">): Promise<NextResponse> {
  const { locale: requestedLocale } = await ctx.params;
  const locale = hasLocale(routing.locales, requestedLocale) ? requestedLocale : routing.defaultLocale;
  const searchParams = request.nextUrl.searchParams;
  const tokenHash = searchParams.get("token_hash");
  const otpType = searchParams.get("type");
  const code = searchParams.get("code");
  const nextPath = getSafeRedirectPath(searchParams.get("next"));

  const failureUrl = new URL(
    getPathname({ href: { pathname: "/login", query: { error: "confirm" } }, locale }),
    request.url,
  );
  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.redirect(failureUrl);

  try {
    let errorFound: unknown = null;
    if (tokenHash && isEmailOtpType(otpType)) {
      ({ error: errorFound } = await supabase.auth.verifyOtp({ type: otpType, token_hash: tokenHash }));
    } else if (code) {
      ({ error: errorFound } = await supabase.auth.exchangeCodeForSession(code));
    } else {
      return NextResponse.redirect(failureUrl);
    }

    if (errorFound) return NextResponse.redirect(failureUrl);
    return NextResponse.redirect(new URL(getPathname({ href: nextPath, locale }), request.url));
  } catch (error) {
    logServerError("auth.confirm", error);
    return NextResponse.redirect(failureUrl);
  }
}
