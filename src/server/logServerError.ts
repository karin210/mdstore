import "server-only";

/**
 * Logs an unexpected server error with a short correlation id and returns the id, so the user
 * can quote it to support while the response carries only a safe, generic message.
 * Never pass passwords, tokens or full personal data in `context`.
 */
export function log_server_error(context: string, error: unknown): string {
  const request_id = crypto.randomUUID().slice(0, 8);
  console.error(`[${context}] requestId=${request_id}`, error);
  return request_id;
}
