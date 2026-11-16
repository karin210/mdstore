import type { CommandContext } from "./context.js";
import { lockfile_name, read_lockfile } from "./lockfile.js";
import { format_table } from "./table.js";

/** `mdstore list`: the prompts installed in this project, from the lockfile (no network). */
export async function list_command(context: CommandContext): Promise<void> {
  const lock = await read_lockfile(context.root);
  const slugs = Object.keys(lock.prompts).sort();
  if (slugs.length === 0) {
    context.log(`No prompts installed here yet (no entries in ${lockfile_name}).`);
    return;
  }

  const rows = slugs.map((slug) => {
    const entry = lock.prompts[slug]!;
    return [slug, `v${entry.version}`, entry.kind, entry.tool, entry.path];
  });
  context.log(format_table(["NAME", "VERSION", "KIND", "TOOL", "PATH"], rows));
}
