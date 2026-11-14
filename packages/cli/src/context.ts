import type { ApiClient } from "./api.js";

/** What every command gets: the project root (the current directory), the API and the output. */
export interface CommandContext {
  root: string;
  client: ApiClient;
  log: (line: string) => void;
  warn: (line: string) => void;
}

/** Shown when a command fails for a reason the user can act on (exit code 1, no stack trace). */
export class UserError extends Error {}
