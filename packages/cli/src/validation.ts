import { is_kind, type Kind } from "./kinds.js";

/**
 * Shapes the CLI accepts from the command line and the API. The slug and file-name patterns are the
 * ones the posted_prompts table checks (supabase/migrations), so nothing else reaches a URL or a path.
 */
const slug_pattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const max_slug_length = 80;
const file_name_pattern = /^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const max_file_name_length = 64;
const sha256_pattern = /^[0-9a-f]{64}$/;

export function is_valid_slug(value: unknown): value is string {
  return typeof value === "string" && value.length <= max_slug_length && slug_pattern.test(value);
}

export function is_valid_file_name(value: unknown): value is string {
  return typeof value === "string" && value.length <= max_file_name_length && file_name_pattern.test(value);
}

export function is_sha256(value: unknown): value is string {
  return typeof value === "string" && sha256_pattern.test(value);
}

export function is_positive_integer(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

/** One prompt in GET /api/v1/prompts. */
export interface PromptSummary {
  slug: string;
  title: string;
  tagline: string;
  category: string;
  kind: Kind;
  version: number;
  priceUsd: number;
  fileName: string;
  author: string;
}

/** GET /api/v1/prompts/[slug]. `sha256` is null for paid prompts. */
export interface PromptDetails extends PromptSummary {
  sha256: string | null;
  worksWith: string[];
  lineCount: number;
  context_tokens: number;
}

/** Thrown when the API answers with something the CLI can't trust. */
export class InvalidResponseError extends Error {}

function is_record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function read_string(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string") throw new InvalidResponseError(`"${key}" is missing or not text`);
  return value;
}

export function parse_prompt_summary(value: unknown): PromptSummary {
  if (!is_record(value)) throw new InvalidResponseError("a prompt is not an object");
  const { slug, kind, version, priceUsd, fileName } = value;
  if (!is_valid_slug(slug)) throw new InvalidResponseError(`invalid slug ${JSON.stringify(slug)}`);
  if (!is_kind(kind)) {
    throw new InvalidResponseError(`"${slug}" has kind ${JSON.stringify(kind)}, which needs a newer mdstore CLI`);
  }
  if (!is_positive_integer(version)) throw new InvalidResponseError(`"${slug}" has an invalid version`);
  if (typeof priceUsd !== "number" || priceUsd < 0) throw new InvalidResponseError(`"${slug}" has an invalid price`);
  if (!is_valid_file_name(fileName)) throw new InvalidResponseError(`"${slug}" has an invalid file name`);
  return {
    slug,
    title: read_string(value, "title"),
    tagline: read_string(value, "tagline"),
    category: read_string(value, "category"),
    kind,
    version,
    priceUsd,
    fileName,
    author: read_string(value, "author"),
  };
}

export function parse_prompt_details(value: unknown): PromptDetails {
  const summary = parse_prompt_summary(value);
  const record = value as Record<string, unknown>;
  const { sha256, worksWith, lineCount, context_tokens } = record;
  if (sha256 !== null && !is_sha256(sha256)) throw new InvalidResponseError(`"${summary.slug}" has an invalid sha256`);
  return {
    ...summary,
    sha256,
    worksWith: Array.isArray(worksWith) ? worksWith.filter((tool): tool is string => typeof tool === "string") : [],
    lineCount: typeof lineCount === "number" ? lineCount : 0,
    context_tokens: typeof context_tokens === "number" ? context_tokens : 0,
  };
}

export function parse_prompt_list(value: unknown): PromptSummary[] {
  if (!is_record(value) || !Array.isArray(value.prompts)) throw new InvalidResponseError("no prompt list");
  return value.prompts.map(parse_prompt_summary);
}
