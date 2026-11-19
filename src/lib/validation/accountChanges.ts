import { z } from "zod";
import {
  emailSchema,
  getSignInPasswordGuidance,
  getSignUpPasswordGuidance,
  type GuidanceKey,
} from "@/lib/validation/credentials";

/**
 * Rules for the /profile forms that change the account's email and password, shared by the forms
 * (client) and src/server/profiles/actions.ts. Usernames use src/lib/validation/username.ts.
 */

/** Days a user waits between two username changes; change_username() in the database enforces it. */
export const USERNAME_CHANGE_COOLDOWN_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/** When the username can change again, or null when it can change now (never changed, or long ago). */
export function get_next_username_change(changed_at: string | null, now: Date = new Date()): Date | null {
  if (!changed_at) return null;
  const next_change = new Date(new Date(changed_at).getTime() + USERNAME_CHANGE_COOLDOWN_DAYS * DAY_MS);
  return next_change > now ? next_change : null;
}

export type NewPasswordGuidanceKey = GuidanceKey | "passwordUnchanged";

/** The new password follows the sign-up rules and differs from the current one. */
export function get_new_password_guidance(
  new_password: string,
  current_password: string,
): NewPasswordGuidanceKey | null {
  const guidance_key = getSignUpPasswordGuidance(new_password);
  if (guidance_key) return guidance_key;
  return new_password === current_password ? "passwordUnchanged" : null;
}

/** The new email; it only replaces the current one once the user opens the link sent to it. */
export const change_email_schema = z.strictObject({ email: emailSchema });

export const change_password_schema = z
  .strictObject({
    // Checked like sign-in: older accounts may have a password that predates the rules.
    current_password: z.string().superRefine((value, ctx) => {
      const guidance_key = getSignInPasswordGuidance(value);
      if (guidance_key) ctx.addIssue({ code: "custom", message: guidance_key });
    }),
    new_password: z.string(),
  })
  .superRefine((values, ctx) => {
    const guidance_key = get_new_password_guidance(values.new_password, values.current_password);
    if (guidance_key) ctx.addIssue({ code: "custom", path: ["new_password"], message: guidance_key });
  });

export type ChangePasswordField = "current_password" | "new_password";
