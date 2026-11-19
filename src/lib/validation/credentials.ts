import { z } from "zod";
import { username_schema } from "@/lib/validation/username";

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
  "emailRequired" | "emailFormat" | "passwordRequired" | "passwordRules" | "passwordSpaces" | "passwordTooLong";

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------

export type EmailPartId = "name" | "at" | "domain" | "dot" | "tld";

export interface ChunkState<Id extends string> {
  id: Id;
  isMet: boolean;
}

/**
 * The example `name@domain.com`, chunk by chunk, with whether the typed value already has each part.
 * Every chunk is met exactly when the whole email is valid (see isEmailValid).
 */
export function getEmailParts(valueRaw: string): ChunkState<EmailPartId>[] {
  const valueTrimmed = valueRaw.trim();
  const atIndex = valueTrimmed.indexOf("@");
  const hasSingleAt = atIndex > 0 && valueTrimmed.indexOf("@", atIndex + 1) === -1;
  const localPart = atIndex === -1 ? valueTrimmed : valueTrimmed.slice(0, atIndex);
  const host = hasSingleAt ? valueTrimmed.slice(atIndex + 1) : "";
  const lastDotIndex = host.lastIndexOf(".");
  const domainPart = lastDotIndex > 0 ? host.slice(0, lastDotIndex) : "";
  const tldPart = lastDotIndex > 0 ? host.slice(lastDotIndex + 1) : "";

  return [
    {
      id: "name",
      isMet: localPart.length > 0 && !/\s/.test(localPart) && valueTrimmed.length <= EMAIL_MAX_LENGTH,
    },
    { id: "at", isMet: hasSingleAt },
    { id: "domain", isMet: /^[^\s@.]+(\.[^\s@.]+)*$/.test(domainPart) },
    { id: "dot", isMet: lastDotIndex > 0 },
    { id: "tld", isMet: /^[A-Za-z]{2,}$/.test(tldPart) },
  ];
}

export function isEmailValid(valueRaw: string): boolean {
  return getEmailParts(valueRaw).every((part) => part.isMet);
}

export function getEmailGuidance(valueRaw: string): GuidanceKey | null {
  if (valueRaw.trim() === "") return "emailRequired";
  return isEmailValid(valueRaw) ? null : "emailFormat";
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
export function getSignUpPasswordRules(value: string): ChunkState<PasswordRuleId>[] {
  return [
    { id: "length", isMet: /^\S{8,}$/.test(value) && value.length <= PASSWORD_MAX_LENGTH },
    { id: "lower", isMet: /[a-z]/.test(value) },
    { id: "upper", isMet: /[A-Z]/.test(value) },
    { id: "digit", isMet: /\d/.test(value) },
  ];
}

export function isSignUpPasswordValid(value: string): boolean {
  return SIGN_UP_PASSWORD_PATTERN.test(value) && value.length <= PASSWORD_MAX_LENGTH;
}

export function getSignUpPasswordGuidance(value: string): GuidanceKey | null {
  if (value === "") return "passwordRequired";
  if (/\s/.test(value)) return "passwordSpaces";
  if (value.length > PASSWORD_MAX_LENGTH) return "passwordTooLong";
  return isSignUpPasswordValid(value) ? null : "passwordRules";
}

/** The guidance the sign-in password field can show (the other fields use their helper line). */
export type SignInPasswordGuidanceKey = Extract<GuidanceKey, "passwordRequired" | "passwordTooLong">;

/** Sign-in only checks that a password was typed: older accounts may predate the sign-up rules. */
export function getSignInPasswordGuidance(value: string): SignInPasswordGuidanceKey | null {
  if (value === "") return "passwordRequired";
  if (value.length > PASSWORD_MAX_LENGTH) return "passwordTooLong";
  return null;
}

/** A random password that satisfies the sign-up rule, with at least one of each required class. */
export function generateSuggestedPassword(length = 20): string {
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const all = lower + upper + digits + "-_";
  const randomValues = crypto.getRandomValues(new Uint32Array(length));
  const pick = (alphabet: string, index: number): string => alphabet[randomValues[index] % alphabet.length];

  const characters = Array.from({ length }, (_, index) => {
    if (index === 0) return pick(lower, index);
    if (index === 1) return pick(upper, index);
    if (index === 2) return pick(digits, index);
    return pick(all, index);
  });
  // Shuffle so the required classes aren't always at the start.
  const shuffleValues = crypto.getRandomValues(new Uint32Array(length));
  for (let index = characters.length - 1; index > 0; index--) {
    const swapIndex = shuffleValues[index] % (index + 1);
    [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
  }
  return characters.join("");
}

// ---------------------------------------------------------------------------
// Server schemas (the same rules, as Zod schemas the auth actions parse with)
// ---------------------------------------------------------------------------

function guidanceCheck(getGuidance: (value: string) => GuidanceKey | null) {
  return (value: string, ctx: z.RefinementCtx): void => {
    const guidanceKey = getGuidance(value);
    if (guidanceKey) ctx.addIssue({ code: "custom", message: guidanceKey });
  };
}

export const emailSchema = z
  .string()
  .superRefine(guidanceCheck(getEmailGuidance))
  .transform((value) => value.trim().toLowerCase());

export const signInSchema = z.strictObject({
  email: emailSchema,
  password: z.string().superRefine(guidanceCheck(getSignInPasswordGuidance)),
});

export const signUpSchema = z.strictObject({
  email: emailSchema,
  username: username_schema,
  password: z.string().superRefine(guidanceCheck(getSignUpPasswordGuidance)),
});

export type CredentialField = "email" | "password";
/** Sign-up also asks for the @username shown on posts and reviews. */
export type SignUpField = CredentialField | "username";
