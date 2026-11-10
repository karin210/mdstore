/** Where people land after signing in when no (valid) return path was given. */
export const DEFAULT_AFTER_SIGN_IN = "/upload";

/**
 * A return path from a query string or form, accepted only when it is a same-site relative path
 * (one leading slash, no `//` or `/\`, no scheme), so it can never become an open redirect.
 */
export function get_safe_redirect_path(value_raw: unknown): string {
  if (typeof value_raw !== "string") return DEFAULT_AFTER_SIGN_IN;
  const is_relative_path = /^\/(?![/\\])[^\s]*$/.test(value_raw) && !value_raw.includes("://");
  return is_relative_path ? value_raw : DEFAULT_AFTER_SIGN_IN;
}
