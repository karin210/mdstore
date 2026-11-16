"use server";

import type { AuthError } from "@supabase/supabase-js";
import { hasLocale } from "next-intl";
import { headers } from "next/headers";
import { getPathname, redirect } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getSafeRedirectPath } from "@/lib/safeRedirect";
import { signInSchema, signUpSchema, type GuidanceKey, type SignUpField } from "@/lib/validation/credentials";
import type { UsernameGuidanceKey } from "@/lib/validation/username";
import { logServerError } from "@/server/logServerError";
import { is_username_taken } from "@/server/profiles/profiles";
import { createServerSupabase } from "@/server/supabase/serverClient";

export type AuthErrorKey =
  "invalidCredentials" | "emailNotConfirmed" | "emailTaken" | "rateLimited" | "fixFields" | "server" | "notConfigured";

export type AuthActionResult =
  | { status: "invalid"; fieldErrors: Partial<Record<SignUpField, FieldGuidanceKey>> }
  | { status: "error"; errorKey: AuthErrorKey; requestId?: string }
  | { status: "checkEmail"; email: string };

export type FieldGuidanceKey = GuidanceKey | UsernameGuidanceKey | "usernameTaken";

export interface CredentialsSubmission {
  email: string;
  password: string;
  /** Sign-up only: the @username to create the account with. */
  username?: string;
  locale: string;
  /** Where to go after signing in; validated as a same-site path. */
  next: string;
}

function getLocale(value: string): Locale {
  return hasLocale(routing.locales, value) ? value : routing.defaultLocale;
}

/** Maps Supabase's known auth failures to user-safe messages; anything else is logged as a 500. */
function toAuthError(context: string, error: AuthError): AuthActionResult {
  switch (error.code) {
    case "invalid_credentials":
      return { status: "error", errorKey: "invalidCredentials" };
    case "email_not_confirmed":
      return { status: "error", errorKey: "emailNotConfirmed" };
    case "user_already_exists":
    case "email_exists":
      return { status: "error", errorKey: "emailTaken" };
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return { status: "error", errorKey: "rateLimited" };
    default:
      return { status: "error", errorKey: "server", requestId: logServerError(context, error) };
  }
}

function toFieldErrors(issues: { path: PropertyKey[]; message: string }[]): AuthActionResult {
  const fieldErrors: Partial<Record<SignUpField, FieldGuidanceKey>> = {};
  issues.forEach((issue) => {
    const field = issue.path[0];
    if ((field === "email" || field === "password" || field === "username") && !fieldErrors[field]) {
      fieldErrors[field] = issue.message as FieldGuidanceKey;
    }
  });
  return { status: "invalid", fieldErrors };
}

/** Signs in with email and password, then redirects to the validated return path. */
export async function signIn(submission: CredentialsSubmission): Promise<AuthActionResult> {
  const locale = getLocale(submission.locale);
  const parsed = signInSchema.safeParse({ email: submission.email, password: submission.password });
  if (!parsed.success) return toFieldErrors(parsed.error.issues);

  const supabase = await createServerSupabase();
  if (!supabase) return { status: "error", errorKey: "notConfigured" };

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return toAuthError("auth.signIn", error);

  redirect({ href: getSafeRedirectPath(submission.next), locale });
  return { status: "error", errorKey: "server" }; // unreachable: redirect() throws
}

/**
 * Creates an account. When the project requires email confirmation (the Supabase default), no
 * session starts yet and the user is asked to open the link; otherwise they are signed in at once.
 */
export async function signUp(submission: CredentialsSubmission): Promise<AuthActionResult> {
  const locale = getLocale(submission.locale);
  const parsed = signUpSchema.safeParse({
    email: submission.email,
    username: submission.username ?? "",
    password: submission.password,
  });
  if (!parsed.success) return toFieldErrors(parsed.error.issues);

  const supabase = await createServerSupabase();
  if (!supabase) return { status: "error", errorKey: "notConfigured" };

  const { email, password, username } = parsed.data;
  try {
    // Checked first so the form can say so; the database still enforces it (see create_profile_for_new_user).
    if (await is_username_taken(supabase, username)) {
      return { status: "invalid", fieldErrors: { username: "usernameTaken" } };
    }
  } catch (error) {
    return { status: "error", errorKey: "server", requestId: logServerError("auth.signUp", error) };
  }

  const nextPath = getSafeRedirectPath(submission.next);
  const origin = (await headers()).get("origin") ?? "";
  const confirmPath = getPathname({ href: { pathname: "/auth/confirm", query: { next: nextPath } }, locale });

  // The username travels as user metadata; a database trigger turns it into the profile.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}${confirmPath}`, data: { username } },
  });
  if (error) return toAuthError("auth.signUp", error);

  if (data.session) {
    redirect({ href: nextPath, locale });
  }
  // Also reached for an email that already has an account: Supabase hides that on purpose.
  return { status: "checkEmail", email };
}
