import { readFileSync } from "node:fs";
import { UserError } from "./context.js";

/**
 * PLACEHOLDER: the site has no production URL yet (src/lib/site.ts only has the contact address
 * hello@mdstore.dev), so this guesses the domain from it. Replace it once the site is deployed.
 */
export const placeholder_production_url = "https://mdstore.dev";

/** The site the CLI talks to: MDSTORE_API_URL when set (e.g. http://localhost:3000), else production. */
export function get_base_url(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.MDSTORE_API_URL?.trim();
  const base = configured ? configured : placeholder_production_url;
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    throw new UserError(`MDSTORE_API_URL must be a URL such as http://localhost:3000 (got "${base}").`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new UserError(`MDSTORE_API_URL must start with https:// or http:// (got "${base}").`);
  }
  return url.href.replace(/\/+$/, "");
}

/** This CLI's version, from its package.json (one level above dist/). */
export function get_cli_version(): string {
  const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string };
  return manifest.version;
}
