"use server";

import type { AuthError } from "@supabase/supabase-js";
import { hasLocale } from "next-intl";
import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import {
  change_email_schema,
  change_password_schema,
  type ChangePasswordField,
  type NewPasswordGuidanceKey,
} from "@/lib/validation/accountChanges";
import { username_schema, type UsernameGuidanceKey } from "@/lib/validation/username";
import { getSignedInUser } from "@/server/auth/getSignedInUser";
import { logServerError } from "@/server/logServerError";
import { POSTED_PROMPTS_TAG } from "@/server/prompts/postedPrompts";
import { is_username_taken, PROFILES_TABLE } from "@/server/profiles/profiles";
import { createServerSupabase } from "@/server/supabase/serverClient";

type CommonErrorKey = "unauthenticated" | "notConfigured" | "server";

export type SetUsernameResult =
  | { status: "saved" }
  | { status: "invalid"; guidance_key: UsernameGuidanceKey | "usernameTaken" }
  | { status: "error"; error_key: CommonErrorKey | "alreadySet"; request_id?: string };

export type ChangeUsernameResult =
  | { status: "saved"; username: string }
  | { status: "invalid"; guidance_key: UsernameGuidanceKey | "usernameTaken" }
  | { status: "error"; error_key: CommonErrorKey | "tooSoon" | "usernameRequired"; request_id?: string };

export type ChangeEmailResult =
  | { status: "checkEmail"; email: string }
  | { status: "invalid" }
  | { status: "error"; error_key: CommonErrorKey | "sameEmail" | "emailTaken" | "rateLimited"; request_id?: string };

export type ChangePasswordResult =
  | { status: "saved" }
  | { status: "invalid"; field: ChangePasswordField; guidance_key: NewPasswordGuidanceKey | "currentPasswordWrong" }
  | { status: "error"; error_key: CommonErrorKey | "rateLimited"; request_id?: string };

const UNIQUE_VIOLATION = "23505";

function error_code(error: unknown): string {
  return typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
}

function is_rate_limited(error: AuthError): boolean {
  return error.code === "over_request_rate_limit" || error.code === "over_email_send_rate_limit";
}

/** Saves the signed-in user's first @username (accounts created before usernames existed). */
export async function set_username(username_raw: string): Promise<SetUsernameResult> {
  const parsed = username_schema.safeParse(username_raw);
  if (!parsed.success) {
    return { status: "invalid", guidance_key: parsed.error.issues[0].message as UsernameGuidanceKey };
  }

  const user = await getSignedInUser();
  if (!user) return { status: "error", error_key: "unauthenticated" };
  const supabase = await createServerSupabase();
  if (!supabase) return { status: "error", error_key: "notConfigured" };

  try {
    if (await is_username_taken(supabase, parsed.data)) return { status: "invalid", guidance_key: "usernameTaken" };

    // Row-level security only accepts the caller's own row.
    const { error } = await supabase.from(PROFILES_TABLE).insert({ user_id: user.id, username: parsed.data });
    if (error?.code === UNIQUE_VIOLATION) {
      // Either the name was taken a moment ago, or this account already has one (primary key).
      const { count } = await supabase
        .from(PROFILES_TABLE)
        .select("user_id", { count: "exact", head: true })
        .eq("user_id", user.id);
      return (count ?? 0) > 0
        ? { status: "error", error_key: "alreadySet" }
        : { status: "invalid", guidance_key: "usernameTaken" };
    }
    if (error)
      return { status: "error", error_key: "server", request_id: logServerError("profiles.setUsername", error) };
  } catch (error) {
    return { status: "error", error_key: "server", request_id: logServerError("profiles.setUsername", error) };
  }
  return { status: "saved" };
}

/**
 * Renames the signed-in user's @username through change_username() in the database, which checks
 * the name and the 30-day cool-down and rewrites the handle on their posts. Public pages cache
 * bylines, so they are refreshed afterwards.
 */
export async function change_username(username_raw: string): Promise<ChangeUsernameResult> {
  const parsed = username_schema.safeParse(username_raw);
  if (!parsed.success) {
    return { status: "invalid", guidance_key: parsed.error.issues[0].message as UsernameGuidanceKey };
  }

  const supabase = await createServerSupabase();
  if (!supabase) return { status: "error", error_key: "notConfigured" };

  try {
    const { data, error } = await supabase.rpc("change_username", { p_username: parsed.data });
    switch (error_code(error)) {
      case "":
        break;
      case "MD409":
      case UNIQUE_VIOLATION:
        return { status: "invalid", guidance_key: "usernameTaken" };
      case "MD422":
        return { status: "invalid", guidance_key: "usernameFormat" };
      case "MD429":
        return { status: "error", error_key: "tooSoon" };
      case "MD428":
        return { status: "error", error_key: "usernameRequired" };
      case "MD401":
      case "42501":
        return { status: "error", error_key: "unauthenticated" };
      default:
        return { status: "error", error_key: "server", request_id: logServerError("profiles.changeUsername", error) };
    }
    updateTag(POSTED_PROMPTS_TAG);
    return { status: "saved", username: String(data) };
  } catch (error) {
    return { status: "error", error_key: "server", request_id: logServerError("profiles.changeUsername", error) };
  }
}

/**
 * Asks Supabase to move the account to a new email. Nothing changes until the user opens the link
 * sent to the new address (and, with "secure email change" on, the one sent to the current one);
 * the link lands on /auth/confirm, which returns them to /profile.
 */
export async function change_email(email_raw: string, locale_raw: string): Promise<ChangeEmailResult> {
  const parsed = change_email_schema.safeParse({ email: email_raw });
  if (!parsed.success) return { status: "invalid" };

  const user = await getSignedInUser();
  if (!user) return { status: "error", error_key: "unauthenticated" };
  if (user.email?.toLowerCase() === parsed.data.email) return { status: "error", error_key: "sameEmail" };
  const supabase = await createServerSupabase();
  if (!supabase) return { status: "error", error_key: "notConfigured" };

  const locale = hasLocale(routing.locales, locale_raw) ? locale_raw : routing.defaultLocale;
  const origin = (await headers()).get("origin") ?? "";
  const confirm_path = getPathname({ href: { pathname: "/auth/confirm", query: { next: "/profile" } }, locale });

  try {
    const { error } = await supabase.auth.updateUser(
      { email: parsed.data.email },
      { emailRedirectTo: `${origin}${confirm_path}` },
    );
    if (error?.code === "email_exists" || error?.code === "user_already_exists") {
      return { status: "error", error_key: "emailTaken" };
    }
    if (error && is_rate_limited(error)) return { status: "error", error_key: "rateLimited" };
    if (error)
      return { status: "error", error_key: "server", request_id: logServerError("profiles.changeEmail", error) };
  } catch (error) {
    return { status: "error", error_key: "server", request_id: logServerError("profiles.changeEmail", error) };
  }
  return { status: "checkEmail", email: parsed.data.email };
}

/**
 * Changes the signed-in user's password after checking the current one, so a session left open on
 * a shared computer isn't enough to take over the account.
 */
export async function change_password(current_password: string, new_password: string): Promise<ChangePasswordResult> {
  const parsed = change_password_schema.safeParse({ current_password, new_password });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      status: "invalid",
      field: issue.path[0] === "new_password" ? "new_password" : "current_password",
      guidance_key: issue.message as NewPasswordGuidanceKey,
    };
  }

  const user = await getSignedInUser();
  if (!user?.email) return { status: "error", error_key: "unauthenticated" };
  const supabase = await createServerSupabase();
  if (!supabase) return { status: "error", error_key: "notConfigured" };

  try {
    // Signing in again is how Supabase checks a password; it renews this session's cookies.
    const { error: check_error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: parsed.data.current_password,
    });
    if (check_error?.code === "invalid_credentials") {
      return { status: "invalid", field: "current_password", guidance_key: "currentPasswordWrong" };
    }
    if (check_error && is_rate_limited(check_error)) return { status: "error", error_key: "rateLimited" };
    if (check_error) {
      return {
        status: "error",
        error_key: "server",
        request_id: logServerError("profiles.changePassword", check_error),
      };
    }

    const { error } = await supabase.auth.updateUser({ password: parsed.data.new_password });
    if (error?.code === "same_password") {
      return { status: "invalid", field: "new_password", guidance_key: "passwordUnchanged" };
    }
    if (error?.code === "weak_password")
      return { status: "invalid", field: "new_password", guidance_key: "passwordRules" };
    if (error && is_rate_limited(error)) return { status: "error", error_key: "rateLimited" };
    if (error)
      return { status: "error", error_key: "server", request_id: logServerError("profiles.changePassword", error) };
  } catch (error) {
    return { status: "error", error_key: "server", request_id: logServerError("profiles.changePassword", error) };
  }
  return { status: "saved" };
}
