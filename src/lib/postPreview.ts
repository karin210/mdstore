import type { TestedModel } from "@/data/aiModels";
import type { OutputExample, PromptCategory } from "@/data/prompts";
import { estimate_context_tokens } from "@/lib/estimateContextTokens";
import type { PromptPostValues } from "@/lib/forms/PromptPostForm";
import { get_post_file_name } from "@/lib/postFileName";
import type { ListingEmptyField, PromptListingView } from "@/lib/promptView";
import { slugify } from "@/lib/slugify";
import { splitFileLines } from "@/lib/splitFileLines";
import { checkPreviewLineCount, isPromptCategory, PREVIEW_LINES, splitLines } from "@/lib/validation/promptPost";

/*
 * The live preview of the upload form (/upload/preview). The form and the preview run in different tabs of
 * the same browser and talk over one BroadcastChannel; nothing is stored or sent to the server.
 *
 * There is a single preview at a time: every open form (a new post on /upload, a new version on a review page)
 * sends its state on the same channel, stamped with the moment the author last edited it or switched to its
 * tab, and the preview always shows the most recently active form. Switching forms overwrites the preview.
 */

export const POST_PREVIEW_CHANNEL = "mdstore-post-preview";

/** A form's state as the preview needs it. Structured-cloneable: the picked files travel as File objects. */
export interface PostPreviewSnapshot {
  values: PromptPostValues;
  /** Who the listing will credit: "@username" for a new post, the post's authors for a new version. */
  byline: string;
  /** The post's slug for a new version; null for a new post, whose slug comes from its title. */
  post_slug: string | null;
  /** A new version's current file, shown while no new file is picked; null for a new post. */
  current_file: PreviewFile | null;
  /** What the staff recorded the post as tested with (empty for a new post); the form doesn't ask for it. */
  tested_with: { works_with: string[]; tested_models: TestedModel[] };
}

/** A Markdown file as the preview reads it. */
export interface PreviewFile {
  name: string;
  text: string;
}

export type PostPreviewMessage =
  /** A form's current state; `active_at` is when its author last edited it or switched to its tab. */
  | { type: "snapshot"; source_id: string; active_at: number; snapshot: PostPreviewSnapshot }
  /** The form's tab is closing or navigating away. */
  | { type: "closed"; source_id: string }
  /** Sent by a preview when it opens: every open form answers with a snapshot. */
  | { type: "request" };

export interface PreviewListing {
  prompt: PromptListingView;
  /** Null while the author hasn't chosen one; the listing then leaves the category blank. */
  category: PromptCategory | null;
  /** The parts the author hasn't filled in yet: the listing leaves them blank, keeping their space. */
  empty_fields: Set<ListingEmptyField>;
}

interface PreviewListingInput {
  snapshot: PostPreviewSnapshot;
  /** The picked file, or else the current one of a new version; null when there is none yet. */
  file: PreviewFile | null;
  /** Browser URLs of the output examples, by item id (blob: URLs for picked images, Storage URLs for saved ones). */
  image_urls: ReadonlyMap<string, string>;
}

/**
 * The listing a form's values will produce, computed the way the server stores a post: slug from the title,
 * file name from the file, excerpt cut at the preview length, context estimated from the file, free.
 * What the author hasn't filled in stays empty and is listed in `empty_fields`.
 */
export function build_preview_listing({ snapshot, file, image_urls }: PreviewListingInput): PreviewListing {
  const { values } = snapshot;
  const empty_fields = new Set<ListingEmptyField>();

  function get_text(field: "title" | "tagline" | "summary"): string {
    const value_trimmed = values[field].trim();
    if (value_trimmed === "") empty_fields.add(field);
    return value_trimmed;
  }

  function get_list(field: "meantFor" | "highlights" | "usageSteps"): string[] {
    const items = splitLines(values[field]);
    if (items.length === 0) empty_fields.add(field);
    return items;
  }

  const title = get_text("title");
  const slug = snapshot.post_slug ?? (slugify(values.title) || "prompt");
  const preview_line_count =
    checkPreviewLineCount(values.previewLineCount) === null ? Number(values.previewLineCount) : PREVIEW_LINES.default;
  const file_lines = file ? splitFileLines(file.text) : [];
  if (!file) empty_fields.add("file");

  const category = isPromptCategory(values.category) ? values.category : null;
  if (!category) empty_fields.add("category");

  const output_examples: OutputExample[] = values.outputExamples.flatMap((example) => {
    const src = image_urls.get(example.id);
    return src ? [{ src, alt: example.caption || title, caption: example.caption }] : [];
  });

  return {
    category,
    empty_fields,
    prompt: {
      slug,
      fileName: file ? get_post_file_name(file.name, slug) : "",
      kind: values.kind,
      author: snapshot.byline,
      // Posting is free for now, like every posted prompt.
      priceUsd: 0,
      lineCount: file_lines.length,
      context_tokens: file ? estimate_context_tokens(file.text) : 0,
      worksWith: snapshot.tested_with.works_with,
      tested_models: snapshot.tested_with.tested_models,
      excerpt: file_lines.slice(0, preview_line_count).join("\n"),
      outputExamples: output_examples,
      title,
      tagline: get_text("tagline"),
      summary: get_text("summary"),
      meantFor: get_list("meantFor"),
      highlights: get_list("highlights"),
      usageSteps: get_list("usageSteps"),
      fullMarkdown: file ? file.text : null,
      // Not rated yet: the listing shows "No ratings yet", as a new post does once approved.
      rating: { average: 0, count: 0 },
    },
  };
}
