import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Full Markdown of a listing's file in content/prompts/.
 * Pass the file name from the catalogue, never from a request, so it can't escape the folder.
 * Cached: the files only change with a deploy.
 */
export async function readPromptMarkdown(fileName: string): Promise<string> {
  "use cache";
  return readFile(path.join(process.cwd(), "content", "prompts", fileName), "utf8");
}
