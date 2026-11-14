/** Characters per token, a rule of thumb for English prose and Markdown. */
const CHARS_PER_TOKEN = 4;

/** Estimates are rounded to this many tokens, so a small edit to a file doesn't change the figure. */
const ROUNDING_STEP = 50;

/**
 * About how many tokens a file takes up in an AI model's context window once it is loaded.
 * A rough estimate: each model counts tokens a little differently, so the page says "about".
 */
export function estimate_context_tokens(text: string): number {
  const exact = text.length / CHARS_PER_TOKEN;
  return Math.max(ROUNDING_STEP, Math.round(exact / ROUNDING_STEP) * ROUNDING_STEP);
}
