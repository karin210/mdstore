"use server";

import type { AuthError } from "@supabase/supabase-js";
import { hasLocale } from "next-intl";
import { headers } from "next/headers";
import { getPathname, redirect } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { get_safe_redirect_path } from "@/lib/safeRedirect";
import {
  sign_in_schema,
  sign_up_schema,
  type CredentialField,
  type GuidanceKey,
} from "@/lib/validation/credentials";
import { log_server_error } from "@/server/logServerError";
import { create_server_supabase } from "@/server/supabase/serverClient";

export type AuthErrorKey =
  | "invalidCredentials"
  | "emailNotConfirmed"
  | "emailTaken"
  | "rateLimited"
  | "fixFields"
  | "server"
  | "notConfigured";

export type AuthActionResult =
  | { status: "invalid"; field_errors: Partial<Record<CredentialField, GuidanceKey>> }
  | { status: "error"; error_key: AuthErrorKey; request_id?: string }
  | { status: "check_email"; email: string };

export interface CredentialsSubmission {
  email: string;
  password: string;
  locale: string;
  /** Where to go after signing in; validated as a same-site path. */
  next: string;
}

function get_locale(value: string): Locale {
  return hasLocale(routing.locales, value) ? value : routing.defaultLocale;
}

/** Maps Supabase's known auth failures to user-safe messages; anything else is logged as a 500. */
function to_auth_error(context: string, error: AuthError): AuthActionResult {
  switch (error.code) {
    case "invalid_credentials":
      return { status: "error", error_key: "invalidCredentials" };
    case "email_not_confirmed":
      return { status: "error", error_key: "emailNotConfirmed" };
    case "user_already_exists":
    case "email_exists":
      return { status: "error", error_key: "emailTaken" };
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return { status: "error", error_key: "rateLimited" };
    default:
      return { status: "error", error_key: "server", request_id: log_server_error(context, error) };
  }
}

function to_field_errors(issues: { path: PropertyKey[]; message: string }[]): AuthActionResult {
  const field_errors: Partial<Record<CredentialField, GuidanceKey>> = {};
  issues.forEach((issue) => {
    const field = issue.path[0];
    if ((field === "email" || field === "password") && !field_errors[field]) {
      field_errors[field] = issue.message as GuidanceKey;
    }
  });
  return { status: "invalid", field_errors };
}

/** Signs in with email and password, then redirects to the validated return path. */
export async function sign_in(submission: CredentialsSubmission): Promise<AuthActionResult> {
  const locale = get_locale(submission.locale);
  const parsed = sign_in_schema.safeParse({ email: submission.email, password: submission.password });
  if (!parsed.success) return to_field_errors(parsed.error.issues);

  const supabase = await create_server_supabase();
  if (!supabase) return { status: "error", error_key: "notConfigured" };

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return to_auth_error("auth.sign_in", error);

  redirect({ href: get_safe_redirect_path(submission.next), locale });
  return { status: "error", error_key: "server" }; // unreachable: redirect() throws
}

/**
 * Creates an account. When the project requires email confirmation (the Supabase default), no
 * session starts yet and the user is asked to open the link; otherwise they are signed in at once.
 */
export async function sign_up(submission: CredentialsSubmission): Promise<AuthActionResult> {
  const locale = get_locale(submission.locale);
  const parsed = sign_up_schema.safeParse({ email: submission.email, password: submission.password });
  if (!parsed.success) return to_field_errors(parsed.error.issues);

  const supabase = await create_server_supabase();
  if (!supabase) return { status: "error", error_key: "notConfigured" };

  const next_path = get_safe_redirect_path(submission.next);
  const origin = (await headers()).get("origin") ?? "";
  const confirm_path = getPathname({ href: { pathname: "/auth/confirm", query: { next: next_path } }, locale });

  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${origin}${confirm_path}` },
  });
  if (error) return to_auth_error("auth.sign_up", error);

  if (data.session) {
    redirect({ href: next_path, locale });
  }
  // Also reached for an email that already has an account: Supabase hides that on purpose.
  return { status: "check_email", email: parsed.data.email };
}
