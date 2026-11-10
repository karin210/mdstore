import type { EmailOtpType } from "@supabase/supabase-js";
import { hasLocale } from "next-intl";
import { NextResponse, type NextRequest } from "next/server";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { get_safe_redirect_path } from "@/lib/safeRedirect";
import { log_server_error } from "@/server/logServerError";
import { create_server_supabase } from "@/server/supabase/serverClient";

const EMAIL_OTP_TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

function is_email_otp_type(value: string | null): value is EmailOtpType {
  return EMAIL_OTP_TYPES.includes(value as EmailOtpType);
}

/**
 * Landing point of the confirmation email. Accepts both link formats Supabase can send:
 * `?token_hash=…&type=…` (custom email template) and `?code=…` (default PKCE link).
 * On success the session starts and the user goes to the validated `next` path; on failure,
 * to the login page with a message.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/[locale]/auth/confirm">): Promise<NextResponse> {
  const { locale: requested_locale } = await ctx.params;
  const locale = hasLocale(routing.locales, requested_locale) ? requested_locale : routing.defaultLocale;
  const search_params = request.nextUrl.searchParams;
  const token_hash = search_params.get("token_hash");
  const otp_type = search_params.get("type");
  const code = search_params.get("code");
  const next_path = get_safe_redirect_path(search_params.get("next"));

  const failure_url = new URL(
    getPathname({ href: { pathname: "/login", query: { error: "confirm" } }, locale }),
    request.url,
  );
  const supabase = await create_server_supabase();
  if (!supabase) return NextResponse.redirect(failure_url);

  try {
    let error_found: unknown = null;
    if (token_hash && is_email_otp_type(otp_type)) {
      ({ error: error_found } = await supabase.auth.verifyOtp({ type: otp_type, token_hash }));
    } else if (code) {
      ({ error: error_found } = await supabase.auth.exchangeCodeForSession(code));
    } else {
      return NextResponse.redirect(failure_url);
    }

    if (error_found) return NextResponse.redirect(failure_url);
    return NextResponse.redirect(new URL(getPathname({ href: next_path, locale }), request.url));
  } catch (error) {
    log_server_error("auth.confirm", error);
    return NextResponse.redirect(failure_url);
  }
}
