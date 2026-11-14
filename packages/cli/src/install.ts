import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { confirm, type ConfirmAnswer } from "./confirm.js";
import { hash_file, sha256_hex, verify_sha256 } from "./hash.js";
import type { Tool } from "./kinds.js";
import type { LockEntry } from "./lockfile.js";
import { assert_real_path_inside, resolve_inside_root } from "./paths.js";
import { render_for_target, type InstallPlan } from "./targets.js";
import type { PromptDetails } from "./validation.js";

/** The user declined (or couldn't be asked) to overwrite a file; nothing was written. */
export class InstallCancelledError extends Error {}

export interface InstallInput {
  root: string;
  details: PromptDetails;
  /** The downloaded .md, checked against details.sha256 before anything is written. */
  content: string;
  tool: Tool;
  plan: InstallPlan;
  assume_yes: boolean;
  /** The lockfile entry of an earlier install: its file is replaced without asking while unedited. */
  previous?: LockEntry;
  ask?: (question: string, assume_yes: boolean) => Promise<ConfirmAnswer>;
}

export interface InstallResult {
  entry: LockEntry;
  /** False when the file on disk was already identical. */
  wrote_file: boolean;
  /** True when the shared file got a new reference line. */
  added_reference: boolean;
}

/** Returns when the file may be replaced; throws InstallCancelledError otherwise. */
async function confirm_overwrite(input: InstallInput, file: string, existing_hash: string): Promise<void> {
  const previous = input.previous;
  // The CLI's own unedited copy from an earlier install: replacing it loses nothing.
  if (previous && previous.path === file && previous.sha256 === existing_hash) return;

  const answer = await (input.ask ?? confirm)(`${file} already exists and differs. Overwrite it?`, input.assume_yes);
  if (answer === "yes") return;
  if (answer === "not_interactive") {
    throw new InstallCancelledError(`${file} already exists. Run again with --yes to overwrite it.`);
  }
  throw new InstallCancelledError(`Left ${file} as it was.`);
}

/** Appends `line` to a shared file unless one of its lines already is exactly that. Creates the file if needed. */
async function add_reference_line(root: string, relative_file: string, line: string): Promise<boolean> {
  const absolute = resolve_inside_root(root, relative_file);
  await mkdir(path.dirname(absolute), { recursive: true });
  await assert_real_path_inside(root, absolute);

  let text = "";
  try {
    text = await readFile(absolute, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (text.split(/\r?\n/).some((existing) => existing.trim() === line)) return false;

  const separator = text === "" ? "" : text.endsWith("\n") ? "\n" : "\n\n";
  await writeFile(absolute, `${text}${separator}${line}\n`, "utf8");
  return true;
}

/**
 * Verifies the download, writes the prompt where the plan says (asking before replacing a file
 * that differs) and adds the shared file's reference line. Returns the new lockfile entry.
 */
export async function install_prompt(input: InstallInput): Promise<InstallResult> {
  const { root, details, content, plan } = input;
  if (details.sha256 === null) throw new InstallCancelledError(`"${details.slug}" can't be installed: it is paid.`);
  verify_sha256(content, details.sha256, details.slug);

  const absolute = resolve_inside_root(root, plan.file);
  const body = render_for_target(plan.file, content, details);
  const body_hash = sha256_hex(body);

  const existing_hash = await hash_file(absolute);
  const wrote_file = existing_hash !== body_hash;
  if (existing_hash !== null && wrote_file) await confirm_overwrite(input, plan.file, existing_hash);

  if (wrote_file) {
    await mkdir(path.dirname(absolute), { recursive: true });
    await assert_real_path_inside(root, absolute);
    await writeFile(absolute, body, "utf8");
  }

  const added_reference = plan.reference
    ? await add_reference_line(root, plan.reference.file, plan.reference.line)
    : false;

  const entry: LockEntry = {
    version: details.version,
    sha256: body_hash,
    path: plan.file,
    kind: details.kind,
    tool: input.tool,
  };
  if (plan.reference) entry.reference = plan.reference.file;
  return { entry, wrote_file, added_reference };
}
