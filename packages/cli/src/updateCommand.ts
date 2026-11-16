import { ApiError } from "./api.js";
import { UserError, type CommandContext } from "./context.js";
import { hash_file, IntegrityError } from "./hash.js";
import { install_prompt, InstallCancelledError } from "./install.js";
import { lockfile_name, read_lockfile, write_lockfile, type Lockfile } from "./lockfile.js";
import { resolve_inside_root } from "./paths.js";

type UpdateOutcome = "updated" | "current" | "skipped";

/** Updates one installed prompt in place (same path and tool), recording it in `lock`. */
async function update_one(
  context: CommandContext,
  lock: Lockfile,
  slug: string,
  assume_yes: boolean,
): Promise<UpdateOutcome> {
  const { root, client, log, warn } = context;
  const entry = lock.prompts[slug]!;

  let details;
  try {
    details = await client.get_prompt(slug);
  } catch (error) {
    if (error instanceof ApiError && error.kind === "not_found") {
      warn(`${slug}: no longer on mdstore; kept your copy.`);
      return "skipped";
    }
    throw error;
  }
  if (details.version <= entry.version) {
    log(`${slug}: up to date (v${entry.version}).`);
    return "current";
  }
  if (details.priceUsd > 0 || details.sha256 === null) {
    warn(`${slug}: ${client.paid_error(slug).message}`);
    return "skipped";
  }

  const local_hash = await hash_file(resolve_inside_root(root, entry.path));
  if (local_hash !== null && local_hash !== entry.sha256 && !assume_yes) {
    warn(
      `${slug}: ${entry.path} was edited since it was installed; skipped. Run "mdstore update ${slug} --yes" to replace your changes.`,
    );
    return "skipped";
  }
  if (details.kind !== entry.kind) {
    warn(
      `${slug}: is now a ${details.kind} (was ${entry.kind}); updating in place. Run "mdstore add ${slug}" to move it.`,
    );
  }

  const content = await client.get_prompt_file(slug);
  const plan = { file: entry.path };
  const result = await install_prompt({ root, details, content, tool: entry.tool, plan, assume_yes, previous: entry });
  lock.prompts[slug] = { ...result.entry, kind: entry.kind };
  await write_lockfile(root, lock);
  log(`${slug}: updated v${entry.version} → v${details.version} (${entry.path}).`);
  return "updated";
}

/** `mdstore update [slug]`: updates one or every installed prompt that has a newer version. */
export async function update_command(
  context: CommandContext,
  slug: string | undefined,
  assume_yes: boolean,
): Promise<void> {
  const lock = await read_lockfile(context.root);
  const slugs = slug === undefined ? Object.keys(lock.prompts).sort() : [slug];
  if (slug !== undefined && !lock.prompts[slug]) {
    throw new UserError(`"${slug}" isn't installed here. Install it with: npx mdstore add ${slug}`);
  }
  if (slugs.length === 0) {
    context.log(`No prompts installed here yet (no entries in ${lockfile_name}).`);
    return;
  }

  let failures = 0;
  for (const current of slugs) {
    try {
      const outcome = await update_one(context, lock, current, assume_yes);
      if (outcome === "skipped") failures += 1;
    } catch (error) {
      // One prompt that can't be written doesn't stop the others; network errors still do.
      if (!(error instanceof InstallCancelledError) && !(error instanceof IntegrityError)) throw error;
      context.warn(`${current}: ${error.message}`);
      failures += 1;
    }
  }
  if (failures > 0) {
    throw new UserError(`${failures} prompt${failures === 1 ? " was" : "s were"} not updated (see above).`);
  }
}
