import "server-only";
import type { OutputExample } from "@/lib/validation/promptPost";

/**
 * The examples a request may attach to a post: each one is either in the signed-in user's own Storage
 * folder (a fresh upload; the bucket's policies only let them write there) or already part of the
 * post's latest revision (`kept_paths`). Anything else is someone else's file, so the request is refused.
 */
export function can_use_output_examples(
  examples: OutputExample[],
  user_id: string,
  kept_paths: readonly string[] = [],
): boolean {
  return examples.every((example) => example.path.startsWith(`${user_id}/`) || kept_paths.includes(example.path));
}

/** The paths of a revision's examples, from its jsonb column. */
export function to_output_examples(value: unknown): OutputExample[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) =>
    typeof item?.path === "string" && typeof item?.caption === "string"
      ? [{ path: item.path, caption: item.caption }]
      : [],
  );
}
