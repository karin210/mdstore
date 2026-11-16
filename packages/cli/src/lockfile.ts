import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { is_kind, is_tool, type Kind, type Tool } from "./kinds.js";
import { resolve_inside_root } from "./paths.js";
import { is_positive_integer, is_sha256, is_valid_slug } from "./validation.js";

/**
 * mdstore.lock.json at the project root: what `add` installed, so `list`, `outdated` and `update`
 * work without asking the API what's on disk. Commit it, like any lockfile.
 */
export const lockfile_name = "mdstore.lock.json";

export interface LockEntry {
  version: number;
  /** SHA-256 of the file as written to `path`, to notice local edits before an update. */
  sha256: string;
  /** Project-relative path of the installed file, with `/` separators. */
  path: string;
  kind: Kind;
  tool: Tool;
}

export interface Lockfile {
  version: 1;
  prompts: Record<string, LockEntry>;
}

export class LockfileError extends Error {}

export function empty_lockfile(): Lockfile {
  return { version: 1, prompts: {} };
}

function is_safe_relative(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    resolve_inside_root(path.resolve("/project"), value);
    return true;
  } catch {
    return false;
  }
}

function parse_entry(slug: string, value: unknown): LockEntry {
  const fail = (reason: string): never => {
    throw new LockfileError(`${lockfile_name}: "${slug}" ${reason}.`);
  };
  if (typeof value !== "object" || value === null) return fail("is not an object");
  const entry = value as Record<string, unknown>;
  if (!is_positive_integer(entry.version)) fail("has an invalid version");
  if (!is_sha256(entry.sha256)) fail("has an invalid sha256");
  if (!is_safe_relative(entry.path)) fail("has a path outside the project");
  if (!is_kind(entry.kind)) fail("has an unknown kind");
  if (!is_tool(entry.tool)) fail("has an unknown tool");

  const parsed: LockEntry = {
    version: entry.version as number,
    sha256: entry.sha256 as string,
    path: entry.path as string,
    kind: entry.kind as Kind,
    tool: entry.tool as Tool,
  };
  return parsed;
}

/** Parses and checks a lockfile's text; throws LockfileError with what is wrong. */
export function parse_lockfile(text: string): Lockfile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new LockfileError(`${lockfile_name} is not valid JSON.`);
  }
  if (typeof data !== "object" || data === null) throw new LockfileError(`${lockfile_name} is not an object.`);
  const { version, prompts } = data as Record<string, unknown>;
  if (version !== 1) throw new LockfileError(`${lockfile_name} has version ${String(version)}; this CLI reads 1.`);
  if (typeof prompts !== "object" || prompts === null || Array.isArray(prompts)) {
    throw new LockfileError(`${lockfile_name} has no "prompts" object.`);
  }

  const lock = empty_lockfile();
  for (const [slug, entry] of Object.entries(prompts)) {
    if (!is_valid_slug(slug)) throw new LockfileError(`${lockfile_name}: "${slug}" is not a valid prompt name.`);
    lock.prompts[slug] = parse_entry(slug, entry);
  }
  return lock;
}

/** Stable output (slugs and keys sorted, two-space indent, final newline) so diffs stay small. */
export function serialize_lockfile(lock: Lockfile): string {
  const prompts: Record<string, LockEntry> = {};
  for (const slug of Object.keys(lock.prompts).sort()) {
    const entry = lock.prompts[slug] as LockEntry;
    const sorted: LockEntry = {
      kind: entry.kind,
      path: entry.path,
      sha256: entry.sha256,
      tool: entry.tool,
      version: entry.version,
    };
    prompts[slug] = sorted;
  }
  return `${JSON.stringify({ version: 1, prompts }, null, 2)}\n`;
}

/** The project's lockfile, or an empty one when it doesn't exist yet. */
export async function read_lockfile(root: string): Promise<Lockfile> {
  try {
    return parse_lockfile(await readFile(path.join(root, lockfile_name), "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return empty_lockfile();
    throw error;
  }
}

export async function write_lockfile(root: string, lock: Lockfile): Promise<void> {
  await writeFile(path.join(root, lockfile_name), serialize_lockfile(lock), "utf8");
}
