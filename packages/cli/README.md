# mdstore CLI

Install skills and agents from [mdstore](https://mdstore-seven.vercel.app) into your project, each in the folder your AI tool reads them from (Claude Code, Cursor, Copilot, OpenCode, Codex, Zed).

```sh
npx mdstore search forms
npx mdstore add <skill-or-agent-name>
```

Only free listings can be installed from the CLI for now. Paid ones are bought on the site. A **prompt** is not installed by the CLI: copy it or download it from its page on mdstore.

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

## Where files go

`--tool` is one of `claude`, `cursor`, `copilot`, `opencode`, `codex`, `zed`, `aider` or `agents`. Without it, the CLI looks at the project root and picks the first match: `.claude/` or `CLAUDE.md` (claude), `.cursor/` (cursor), `.github/copilot-instructions.md` (copilot), `.opencode/` (opencode), `CONVENTIONS.md` or `.aider*` (aider), `AGENTS.md` or `.agents/` (agents). With no match it uses `agents`.

Each listing has a kind, set by its author. The CLI installs two of them, into the project (not your home folder):

| Tool                     | `skill`                            | `agent`                       |
| ------------------------ | ---------------------------------- | ----------------------------- |
| `claude`                 | `.claude/skills/<name>/SKILL.md`   | `.claude/agents/<name>.md`    |
| `cursor`                 | `.cursor/skills/<name>/SKILL.md`   | no known folder: use `--path` |
| `copilot`                | `.github/skills/<name>/SKILL.md`   | no known folder: use `--path` |
| `opencode`               | `.opencode/skills/<name>/SKILL.md` | no known folder: use `--path` |
| `codex`, `zed`, `agents` | `.agents/skills/<name>/SKILL.md`   | no known folder: use `--path` |
| `aider`                  | no skills folder: use `--path`     | no known folder: use `--path` |

A `prompt` is not installed by the CLI: copy it or download it from its page on mdstore.

Files are written byte for byte as published, and always to a file of their own that the CLI owns, so installing never touches your own files. A skill is one `SKILL.md` for now; skills that carry more files are not supported yet.

`--path <file>` writes a skill or an agent exactly there instead (it must stay inside the project). A prompt is refused with or without it.

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
    "review": {
      "kind": "skill",
      "path": ".claude/skills/review/SKILL.md",
      "sha256": "…",
      "tool": "claude",
      "version": 1
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
