import { createInterface } from "node:readline/promises";

export type ConfirmAnswer = "yes" | "no" | "not_interactive";

/**
 * Asks a yes/no question on the terminal (default: no). `--yes` answers yes without asking. When
 * stdin isn't a terminal (CI, pipes) nobody can answer, so it returns "not_interactive" and the
 * caller tells the user to pass --yes.
 */
export async function confirm(question: string, assume_yes: boolean): Promise<ConfirmAnswer> {
  if (assume_yes) return "yes";
  if (!process.stdin.isTTY) return "not_interactive";

  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await terminal.question(`${question} [y/N] `);
    return /^y(es)?$/i.test(answer.trim()) ? "yes" : "no";
  } finally {
    terminal.close();
  }
}
