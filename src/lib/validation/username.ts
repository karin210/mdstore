import { z } from "zod";

/**
 * Username rules, shared by the sign-up form, the "pick a username" form, adding a co-author and
 * the server actions. Mirrors the `profiles.username` check in the database. Usernames are shown
 * with a leading @ but stored without it; typing the @ is allowed.
 */
export const USERNAME_PATTERN = /^[A-Za-z0-9._-]{2,39}$/;
export const USERNAME_MAX_LENGTH = 39;

export type UsernameGuidanceKey = "usernameRequired" | "usernameFormat";

/** The username without the optional leading @ and surrounding spaces. */
export function normalize_username(value_raw: string): string {
  return value_raw.trim().replace(/^@/, "");
}

export function get_username_guidance(value_raw: string): UsernameGuidanceKey | null {
  const username = normalize_username(value_raw);
  if (username === "") return "usernameRequired";
  return USERNAME_PATTERN.test(username) ? null : "usernameFormat";
}

export const username_schema = z
  .string()
  .superRefine((value, ctx) => {
    const guidance_key = get_username_guidance(value);
    if (guidance_key) ctx.addIssue({ code: "custom", message: guidance_key });
  })
  .transform(normalize_username);
