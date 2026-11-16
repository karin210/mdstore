import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { hash_file, IntegrityError, sha256_hex, verify_sha256 } from "./hash.js";

// sha256("abc"), from FIPS 180-2.
const abc_hash = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

describe("sha256_hex", () => {
  it("matches the standard test vector, for text and bytes", () => {
    expect(sha256_hex("abc")).toBe(abc_hash);
    expect(sha256_hex(new TextEncoder().encode("abc"))).toBe(abc_hash);
  });

  it("hashes text as UTF-8, like the API", () => {
    expect(sha256_hex("é")).toBe(sha256_hex(Buffer.from([0xc3, 0xa9])));
  });
});

describe("verify_sha256", () => {
  it("passes a matching download", () => {
    expect(() => verify_sha256("abc", abc_hash, "x")).not.toThrow();
  });

  it("rejects a changed download, even by one line ending", () => {
    expect(() => verify_sha256("abc\r\n", abc_hash, "x")).toThrow(IntegrityError);
  });
});

describe("hash_file", () => {
  it("hashes a file's bytes, and returns null when it is missing", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "mdstore-hash-"));
    try {
      writeFileSync(path.join(dir, "a.md"), "abc");
      expect(await hash_file(path.join(dir, "a.md"))).toBe(abc_hash);
      expect(await hash_file(path.join(dir, "missing.md"))).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
