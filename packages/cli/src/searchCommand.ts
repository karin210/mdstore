import type { CommandContext } from "./context.js";
import { format_table } from "./table.js";

/** `mdstore search <query>`: prompts whose name, title, tagline, file or author match. */
export async function search_command(context: CommandContext, query: string): Promise<void> {
  const prompts = await context.client.search(query);
  if (prompts.length === 0) {
    context.log(`No prompts match "${query}".`);
    return;
  }

  const rows = prompts.map((prompt) => [
    prompt.slug,
    prompt.kind,
    prompt.priceUsd === 0 ? "free" : `$${prompt.priceUsd} (site only)`,
    prompt.title,
  ]);
  context.log(format_table(["NAME", "KIND", "PRICE", "TITLE"], rows));
  context.log(`\nInstall one with: npx mdstore add <name>`);
}
