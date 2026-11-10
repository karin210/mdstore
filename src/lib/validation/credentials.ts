import { z } from "zod";

/**
 * Email and password rules shared by the login forms (client) and the auth actions (server), so
 * both accept exactly the same values. The validators return message keys under `auth.guidance`,
 * which the client translates and the server sends back as field errors.
 */

/** Supabase hashes passwords with bcrypt, which reads at most 72 bytes. */
export const PASSWORD_MAX_LENGTH = 72;
export const EMAIL_MAX_LENGTH = 254;

/**
 * Accepts every browser- and password-manager-suggested password (Chrome, Safari, 1Password…):
 * 8+ characters with a lowercase letter, an uppercase letter and a digit; any other non-space
 * character is allowed and none is required. Safari's `passwordrules` attribute mirrors it.
 */
export const SIGN_UP_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)\S{8,}$/;
export const SIGN_UP_PASSWORD_RULES_ATTRIBUTE = "minlength: 8; required: lower; required: upper; required: digit;";

export type GuidanceKey =
  | "emailRequired"
  | "emailFormat"
  | "passwordRequired"
  | "passwordRules"
  | "passwordSpaces"
  | "passwordTooLong";

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------

export type EmailPartId = "name" | "at" | "domain" | "dot" | "tld";

export interface ChunkState<Id extends string> {
  id: Id;
  is_met: boolean;
}

/**
 * The example `name@domain.com`, chunk by chunk, with whether the typed value already has each part.
 * Every chunk is met exactly when the whole email is valid (see is_email_valid).
 */
export function get_email_parts(value_raw: string): ChunkState<EmailPartId>[] {
  const value_trimmed = value_raw.trim();
  const at_index = value_trimmed.indexOf("@");
  const has_single_at = at_index > 0 && value_trimmed.indexOf("@", at_index + 1) === -1;
  const local_part = at_index === -1 ? value_trimmed : value_trimmed.slice(0, at_index);
  const host = has_single_at ? value_trimmed.slice(at_index + 1) : "";
  const last_dot_index = host.lastIndexOf(".");
  const domain_part = last_dot_index > 0 ? host.slice(0, last_dot_index) : "";
  const tld_part = last_dot_index > 0 ? host.slice(last_dot_index + 1) : "";

  return [
    {
      id: "name",
      is_met: local_part.length > 0 && !/\s/.test(local_part) && value_trimmed.length <= EMAIL_MAX_LENGTH,
    },
    { id: "at", is_met: has_single_at },
    { id: "domain", is_met: /^[^\s@.]+(\.[^\s@.]+)*$/.test(domain_part) },
    { id: "dot", is_met: last_dot_index > 0 },
    { id: "tld", is_met: /^[A-Za-z]{2,}$/.test(tld_part) },
  ];
}

export function is_email_valid(value_raw: string): boolean {
  return get_email_parts(value_raw).every((part) => part.is_met);
}

export function get_email_guidance(value_raw: string): GuidanceKey | null {
  if (value_raw.trim() === "") return "emailRequired";
  return is_email_valid(value_raw) ? null : "emailFormat";
}

// ---------------------------------------------------------------------------
// Passwords
// ---------------------------------------------------------------------------

export type PasswordRuleId = "length" | "lower" | "upper" | "digit";

/**
 * The sign-up rules, in the order of the helper text "8 characters, 1 lowercase letter…".
 * Every rule is met exactly when the password is valid: the length rule also fails on spaces or
 * on more than PASSWORD_MAX_LENGTH characters, which the helper line has no separate chunk for.
 */
export function get_sign_up_password_rules(value: string): ChunkState<PasswordRuleId>[] {
  return [
    { id: "length", is_met: /^\S{8,}$/.test(value) && value.length <= PASSWORD_MAX_LENGTH },
    { id: "lower", is_met: /[a-z]/.test(value) },
    { id: "upper", is_met: /[A-Z]/.test(value) },
    { id: "digit", is_met: /\d/.test(value) },
  ];
}

export function is_sign_up_password_valid(value: string): boolean {
  return SIGN_UP_PASSWORD_PATTERN.test(value) && value.length <= PASSWORD_MAX_LENGTH;
}

export function get_sign_up_password_guidance(value: string): GuidanceKey | null {
  if (value === "") return "passwordRequired";
  if (/\s/.test(value)) return "passwordSpaces";
  if (value.length > PASSWORD_MAX_LENGTH) return "passwordTooLong";
  return is_sign_up_password_valid(value) ? null : "passwordRules";
}

/** The guidance the sign-in password field can show (the other fields use their helper line). */
export type SignInPasswordGuidanceKey = Extract<GuidanceKey, "passwordRequired" | "passwordTooLong">;

/** Sign-in only checks that a password was typed: older accounts may predate the sign-up rules. */
export function get_sign_in_password_guidance(value: string): SignInPasswordGuidanceKey | null {
  if (value === "") return "passwordRequired";
  if (value.length > PASSWORD_MAX_LENGTH) return "passwordTooLong";
  return null;
}

/** A random password that satisfies the sign-up rule, with at least one of each required class. */
export function generate_suggested_password(length = 20): string {
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const all = lower + upper + digits + "-_";
  const random_values = crypto.getRandomValues(new Uint32Array(length));
  const pick = (alphabet: string, index: number): string => alphabet[random_values[index] % alphabet.length];

  const characters = Array.from({ length }, (_, index) => {
    if (index === 0) return pick(lower, index);
    if (index === 1) return pick(upper, index);
    if (index === 2) return pick(digits, index);
    return pick(all, index);
  });
  // Shuffle so the required classes aren't always at the start.
  const shuffle_values = crypto.getRandomValues(new Uint32Array(length));
  for (let index = characters.length - 1; index > 0; index--) {
    const swap_index = shuffle_values[index] % (index + 1);
    [characters[index], characters[swap_index]] = [characters[swap_index], characters[index]];
  }
  return characters.join("");
}

// ---------------------------------------------------------------------------
// Server schemas (the same rules, as Zod schemas the auth actions parse with)
// ---------------------------------------------------------------------------

function guidance_check(get_guidance: (value: string) => GuidanceKey | null) {
  return (value: string, ctx: z.RefinementCtx): void => {
    const guidance_key = get_guidance(value);
    if (guidance_key) ctx.addIssue({ code: "custom", message: guidance_key });
  };
}

const email_schema = z
  .string()
  .superRefine(guidance_check(get_email_guidance))
  .transform((value) => value.trim().toLowerCase());

export const sign_in_schema = z.strictObject({
  email: email_schema,
  password: z.string().superRefine(guidance_check(get_sign_in_password_guidance)),
});

export const sign_up_schema = z.strictObject({
  email: email_schema,
  password: z.string().superRefine(guidance_check(get_sign_up_password_guidance)),
});

export type CredentialField = "email" | "password";
