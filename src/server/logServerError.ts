import "server-only";

/**
 * Logs an unexpected server error with a short correlation id and returns the id, so the user
 * can quote it to support while the response carries only a safe, generic message.
 * Never pass passwords, tokens or full personal data in `context`.
 */
export function logServerError(context: string, error: unknown): string {
  const requestId = crypto.randomUUID().slice(0, 8);
  console.error(`[${context}] requestId=${requestId}`, error);
  return requestId;
}
