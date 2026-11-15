# mdstore CLI

Install coding prompts from [mdstore](https://mdstore-seven.vercel.app) into your project: `CLAUDE.md` and `AGENTS.md` instructions, Cursor rules, slash commands and agent playbooks, each in the place your AI tool reads it.

```sh
npx mdstore search forms
npx mdstore add global
```

Only free prompts can be installed from the CLI for now. Paid prompts are bought on the site.

## Commands

| Command                                                   | What it does                                                                                    |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `mdstore add <name> [--tool <tool>] [--path <file>] [-y]` | Downloads a free prompt, checks its SHA-256, installs it and records it in `mdstore.lock.json`. |
| `mdstore search <words>`                                  | Lists prompts whose name, title, tagline, file or author match.                                 |
| `mdstore list`                                            | Lists the prompts installed in this project (from the lockfile, no network).                    |
| `mdstore outdated`                                        | Compares each installed prompt's version with the latest one.                                   |
| `mdstore update [name] [-y]`                              | Updates one or every installed prompt that has a newer version.                                 |
| `mdstore --help` / `--version`                            | Shows the help / the CLI version.                                                               |

Run the commands from your project's root: it is where files and the lockfile are written.

## Where prompts go

`--tool` is one of `claude`, `cursor`, `copilot`, `aider` or `agents`. Without it, the CLI looks at the project root and picks the first match: `.claude/` or `CLAUDE.md` (claude), `.cursor/` (cursor), `.github/copilot-instructions.md` (copilot), `CONVENTIONS.md` or `.aider*` (aider), `AGENTS.md` (agents). With no match it uses `agents`.

Each prompt has a kind, set by its author:

| Kind           | claude                       | cursor                       | copilot                             | aider              | agents          |
| -------------- | ---------------------------- | ---------------------------- | ----------------------------------- | ------------------ | --------------- |
| `instructions` | `CLAUDE.md`\*                | `.cursor/rules/<name>.mdc`   | `.github/copilot-instructions.md`\* | `CONVENTIONS.md`\* | `AGENTS.md`\*   |
| `command`      | `.claude/commands/<name>.md` | `.cursor/commands/<name>.md` | as instructions                     | as instructions    | as instructions |
| `agent`        | `.claude/agents/<name>.md`   | as instructions              | as instructions                     | as instructions    | as instructions |

\* **Shared files are never overwritten.** `CLAUDE.md`, `AGENTS.md` and the like hold your own instructions, and several prompts may target the same one. So the prompt is written to `.mdstore/<name>.md`, and the shared file gets one line pointing at it (the file is created if it doesn't exist; the line is added only once):

- Claude Code: `@.mdstore/<name>.md`, an import Claude Code loads with `CLAUDE.md`.
- Other tools: ``- Follow the instructions in `.mdstore/<name>.md`.``, which the agent follows by reading the file. Aider doesn't open other files on its own: also pass it with `aider --read .mdstore/<name>.md` (or `read:` in `.aider.conf.yml`).

Cursor rules get a short frontmatter (`description`, `alwaysApply`) so Cursor picks them up; every other file is written byte for byte as published.

`--path <file>` writes the prompt exactly there instead (it must stay inside the project), with no reference line.

## Safety

- Prompt names and file names must match the same patterns the site enforces; paths that leave the project root (`..`, absolute paths, links pointing outside) are refused.
- Every download is checked against the SHA-256 the API announces before anything is written.
- An existing file that differs is never replaced without asking. Without a terminal (CI, pipes), pass `--yes` to allow it.
- `update` skips a prompt whose file you edited since it was installed (its hash no longer matches the lockfile) and tells you; `--yes` replaces your edits.

## Lockfile

`mdstore.lock.json` at the project root records what was installed. Commit it.

```json
{
  "version": 1,
  "prompts": {
    "global": {
      "kind": "instructions",
      "path": ".mdstore/global.md",
      "sha256": "…",
      "tool": "claude",
      "version": 1,
      "reference": "CLAUDE.md"
    }
  }
}
```

`sha256` is the hash of the file as written to `path`, so `update` can tell whether you changed it.

## Configuration

`MDSTORE_API_URL` points the CLI at another server, such as a local copy of the site: `MDSTORE_API_URL=http://localhost:3000 npx mdstore search forms`.

## Development

The CLI lives in the mdstore repository as an npm workspace (`packages/cli`); how it fits with the site and its API is in `docs/cli.md`. It has no runtime dependencies and needs Node 24.

```sh
npm run cli:build   # tsc → packages/cli/dist
npm run cli:test    # its Vitest unit tests (npm test runs them too)
node packages/cli/dist/cli.js --help
```
