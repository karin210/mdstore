import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

/** Hex SHA-256 of text (as UTF-8 bytes) or raw bytes; the API hashes a file the same way. */
export function sha256_hex(data: string | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

/** Hex SHA-256 of a file's bytes, or null when it doesn't exist. */
export async function hash_file(file_path: string): Promise<string | null> {
  try {
    return sha256_hex(await readFile(file_path));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

/** Thrown when a downloaded file doesn't match the hash the API announced. */
export class IntegrityError extends Error {}

/** Throws IntegrityError unless the content hashes to `expected`. */
export function verify_sha256(content: string, expected: string, label: string): void {
  const actual = sha256_hex(content);
  if (actual !== expected) {
    throw new IntegrityError(
      `The download of "${label}" is corrupted or was changed in transit (sha256 ${actual}, expected ${expected}). Nothing was written.`,
    );
  }
}
