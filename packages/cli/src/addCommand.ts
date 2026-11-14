import { UserError, type CommandContext } from "./context.js";
import { install_prompt } from "./install.js";
import type { Tool } from "./kinds.js";
import { read_lockfile, write_lockfile } from "./lockfile.js";
import { resolve_inside_root } from "./paths.js";
import { detect_tool, plan_custom_path, plan_install } from "./targets.js";
import { is_valid_slug } from "./validation.js";

export interface AddOptions {
  tool?: Tool;
  path?: string;
  yes: boolean;
}

/** `mdstore add <slug>`: downloads a free prompt, verifies it, installs it for the tool and records it in the lockfile. */
export async function add_command(context: CommandContext, slug: string, options: AddOptions): Promise<void> {
  const { root, client, log } = context;
  if (!is_valid_slug(slug)) {
    throw new UserError(
      `"${slug}" isn't a prompt name. Names use lowercase letters, digits and dashes, like "global".`,
    );
  }
  // Refuse a bad --path before any download.
  if (options.path !== undefined) resolve_inside_root(root, options.path);

  const lock = await read_lockfile(root);
  const details = await client.get_prompt(slug);
  if (details.priceUsd > 0 || details.sha256 === null) throw client.paid_error(slug);

  let tool = options.tool;
  if (!tool) {
    const detected = detect_tool(root);
    tool = detected.tool;
    log(
      detected.marker
        ? `Detected ${tool} (found ${detected.marker}). Use --tool to pick another.`
        : `No AI tool detected; installing for agents (AGENTS.md). Use --tool to pick another.`,
    );
  }

  const content = await client.get_prompt_file(slug);
  const plan = options.path !== undefined ? plan_custom_path(options.path) : plan_install(details.kind, tool, slug);
  const result = await install_prompt({
    root,
    details,
    content,
    tool,
    plan,
    assume_yes: options.yes,
    previous: lock.prompts[slug],
  });

  lock.prompts[slug] = result.entry;
  await write_lockfile(root, lock);

  log(
    result.wrote_file
      ? `Installed ${slug} v${details.version} (${details.kind}) to ${plan.file}.`
      : `${slug} v${details.version} is already in ${plan.file}.`,
  );
  if (plan.reference) {
    log(
      result.added_reference
        ? `Added "${plan.reference.line}" to ${plan.reference.file}.`
        : `${plan.reference.file} already references it.`,
    );
  }
}
