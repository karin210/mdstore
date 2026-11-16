#!/usr/bin/env node
import { parseArgs } from "node:util";
import { add_command } from "./addCommand.js";
import { ApiClient, ApiError } from "./api.js";
import { get_base_url, get_cli_version } from "./config.js";
import { UserError, type CommandContext } from "./context.js";
import { IntegrityError } from "./hash.js";
import { InstallCancelledError } from "./install.js";
import { is_tool, tools } from "./kinds.js";
import { list_command } from "./listCommand.js";
import { LockfileError } from "./lockfile.js";
import { outdated_command } from "./outdatedCommand.js";
import { UnsafePathError } from "./paths.js";
import { search_command } from "./searchCommand.js";
import { update_command } from "./updateCommand.js";

const usage = `mdstore: install coding prompts from mdstore into this project

Usage
  npx mdstore add <name> [--tool <tool>] [--path <file>] [--yes]
  npx mdstore search <words>
  npx mdstore list
  npx mdstore outdated
  npx mdstore update [name] [--yes]

Options
  --tool <tool>   ${tools.join(" | ")} (default: detected from the project's files)
  --path <file>   install to this file instead (inside the project)
  -y, --yes       overwrite without asking (needed when not in a terminal)
  -h, --help      show this help
  -v, --version   show the CLI version

Installed skills and agents are recorded in mdstore.lock.json. Set MDSTORE_API_URL to use another server.`;

/** Errors the user can act on: printed as one line, no stack trace. */
const expected_errors = [UserError, ApiError, InstallCancelledError, IntegrityError, LockfileError, UnsafePathError];

function require_name(positionals: string[], command: string): string {
  const name = positionals[0];
  if (!name) throw new UserError(`Missing the prompt name. Usage: npx mdstore ${command} <name>`);
  return name;
}

async function run(argv: string[]): Promise<number> {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      strict: true,
      options: {
        tool: { type: "string" },
        path: { type: "string" },
        yes: { type: "boolean", short: "y", default: false },
        help: { type: "boolean", short: "h", default: false },
        version: { type: "boolean", short: "v", default: false },
      },
    });
  } catch (error) {
    console.error(`${(error as Error).message}\n\n${usage}`);
    return 2;
  }

  const { values, positionals } = parsed;
  const [command, ...rest] = positionals;
  if (values.version) {
    console.log(get_cli_version());
    return 0;
  }
  if (values.help || !command) {
    console.log(usage);
    return values.help ? 0 : 2;
  }

  try {
    if (values.tool !== undefined && !is_tool(values.tool)) {
      throw new UserError(`Unknown tool "${values.tool}". Use one of: ${tools.join(", ")}.`);
    }
    const context: CommandContext = {
      root: process.cwd(),
      client: new ApiClient(get_base_url()),
      log: (line) => console.log(line),
      warn: (line) => console.error(line),
    };

    switch (command) {
      case "add":
        await add_command(context, require_name(rest, "add"), {
          tool: values.tool as Parameters<typeof add_command>[2]["tool"],
          path: values.path,
          yes: values.yes,
        });
        return 0;
      case "search":
        await search_command(context, rest.join(" "));
        return 0;
      case "list":
        await list_command(context);
        return 0;
      case "outdated":
        await outdated_command(context);
        return 0;
      case "update":
        await update_command(context, rest[0], values.yes);
        return 0;
      default:
        console.error(`Unknown command "${command}".\n\n${usage}`);
        return 2;
    }
  } catch (error) {
    if (expected_errors.some((type) => error instanceof type)) {
      console.error(`Error: ${(error as Error).message}`);
      return 1;
    }
    throw error;
  }
}

process.exitCode = await run(process.argv.slice(2));
