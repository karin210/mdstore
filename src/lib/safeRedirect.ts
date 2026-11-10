/** Where people land after signing in when no (valid) return path was given. */
export const DEFAULT_AFTER_SIGN_IN = "/upload";

/**
 * A return path from a query string or form, accepted only when it is a same-site relative path
 * (one leading slash, no `//` or `/\`, no scheme), so it can never become an open redirect.
 */
export function getSafeRedirectPath(valueRaw: unknown): string {
  if (typeof valueRaw !== "string") return DEFAULT_AFTER_SIGN_IN;
  const isRelativePath = /^\/(?![/\\])[^\s]*$/.test(valueRaw) && !valueRaw.includes("://");
  return isRelativePath ? valueRaw : DEFAULT_AFTER_SIGN_IN;
}
