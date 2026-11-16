import { ApiError } from "./api.js";
import type { CommandContext } from "./context.js";
import { lockfile_name, read_lockfile } from "./lockfile.js";
import { format_table } from "./table.js";

/** `mdstore outdated`: compares each installed prompt's version with the latest one on mdstore. */
export async function outdated_command(context: CommandContext): Promise<void> {
  const lock = await read_lockfile(context.root);
  const slugs = Object.keys(lock.prompts).sort();
  if (slugs.length === 0) {
    context.log(`No prompts installed here yet (no entries in ${lockfile_name}).`);
    return;
  }

  const rows: string[][] = [];
  let outdated_count = 0;
  for (const slug of slugs) {
    const installed = lock.prompts[slug]!.version;
    try {
      const latest = (await context.client.get_prompt(slug)).version;
      const is_outdated = latest > installed;
      if (is_outdated) outdated_count += 1;
      rows.push([slug, `v${installed}`, `v${latest}`, is_outdated ? "update available" : "up to date"]);
    } catch (error) {
      // A removed prompt shouldn't hide the others; network and server errors still stop the command.
      if (!(error instanceof ApiError) || error.kind !== "not_found") throw error;
      rows.push([slug, `v${installed}`, "-", "no longer on mdstore"]);
    }
  }

  context.log(format_table(["NAME", "INSTALLED", "LATEST", "STATUS"], rows));
  context.log(
    outdated_count > 0
      ? `\n${outdated_count} update${outdated_count === 1 ? "" : "s"} available. Run: npx mdstore update`
      : "\nEverything is up to date.",
  );
}
