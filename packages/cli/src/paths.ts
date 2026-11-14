import { realpath } from "node:fs/promises";
import path from "node:path";

/** Thrown when a path would land outside the project root. */
export class UnsafePathError extends Error {}

function is_inside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

/**
 * The absolute path of a project-relative path, refusing absolute paths and anything that climbs
 * out of the root (`../x`, `a/../../x`). Accepts `/` or `\` separators.
 */
export function resolve_inside_root(root: string, relative_path: string): string {
  if (relative_path.trim() === "" || path.isAbsolute(relative_path) || path.win32.isAbsolute(relative_path)) {
    throw new UnsafePathError(`"${relative_path}" must be a path inside the project, relative to its root.`);
  }
  const absolute = path.resolve(root, relative_path);
  if (!is_inside(path.resolve(root), absolute)) {
    throw new UnsafePathError(`"${relative_path}" points outside the project root.`);
  }
  return absolute;
}

/** The nearest part of a path that exists, resolved through symlinks. */
async function real_existing_ancestor(absolute: string): Promise<{ real: string; rest: string }> {
  let current = absolute;
  let rest = "";
  for (;;) {
    try {
      return { real: await realpath(current), rest };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const parent = path.dirname(current);
      if (parent === current) throw error;
      rest = rest === "" ? path.basename(current) : path.join(path.basename(current), rest);
      current = parent;
    }
  }
}

/**
 * Like resolve_inside_root, but also follows symlinks on disk: refuses a target whose existing
 * part (the file itself or a parent folder) is a link leading outside the root.
 */
export async function assert_real_path_inside(root: string, absolute: string): Promise<void> {
  const real_root = await realpath(root);
  const { real, rest } = await real_existing_ancestor(absolute);
  const resolved = rest === "" ? real : path.join(real, rest);
  if (!is_inside(real_root, resolved)) {
    throw new UnsafePathError(`"${path.relative(root, absolute)}" leads outside the project root through a link.`);
  }
}

/** A project-relative path with `/` separators, as stored in the lockfile. */
export function to_posix_relative(root: string, absolute: string): string {
  return path.relative(root, absolute).split(path.sep).join("/");
}
