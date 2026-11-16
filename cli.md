# CLI Agent & Skill Marketplace Installer — Path & Format Specification

## 1. Core Architecture Principles
- **Two Scopes:** Support both **Project-level** (`./` — default, git-committable) and **Global/User-level** (`~/` via `--global` / `-g`).
- **Auto-Detection:** On `install` / `init`, scan for existing global config folders (`~/.claude`, `~/.cursor`, `~/.config/opencode`, `~/.codex`, `~/.copilot`, `~/.codeium/windsurf`, `~/.gemini`) and project markers (`.claude/`, `.cursor/`, `.opencode/`, `.github/`, `.agents/`) to pre-select active agents in an interactive prompt.
- **Canonical Store + Symlinks for Skills:** Download/extract skills once into a canonical directory (`.agents/skills/<slug>/` for project scope, `~/.agents/skills/<slug>/` for global scope) and symlink into target agent skill folders (fallback to file copy on Windows when symlinks lack permission).
- **Schema Compilation for Subagents:** Subagent frontmatter and file extensions are not standardized across tools. Store subagents in a normalized canonical format in the registry, then compile/transform frontmatter and filenames per target agent on install.

---

## 2. Skills Directory Matrix (`<slug>/SKILL.md`)

| Agent ID | Project Path | Global Path | Reads `.agents/skills` Natively? | Reads `.claude/skills` Natively? | Symlink Needed? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `universal` (Canonical) | `.agents/skills/<slug>/SKILL.md` | `~/.agents/skills/<slug>/SKILL.md` | Yes (Primary) | No | Base target |
| `claude` | `.claude/skills/<slug>/SKILL.md` | `~/.claude/skills/<slug>/SKILL.md` | No | Yes (Primary) | **Yes** |
| `cursor` | `.cursor/skills/<slug>/SKILL.md` | `~/.cursor/skills/<slug>/SKILL.md` | Partial | Yes | **Yes** (or rely on `.claude`) |
| `opencode` | `.opencode/skills/<slug>/SKILL.md` | `~/.config/opencode/skills/<slug>/SKILL.md` | Yes | Yes | Optional |
| `codex` | `.agents/skills/<slug>/SKILL.md` | `~/.agents/skills/<slug>/SKILL.md` | Yes (Primary) | No | No (uses canonical) |
| `copilot` | `.github/skills/<slug>/SKILL.md` | `~/.copilot/skills/<slug>/SKILL.md` | Yes | Yes | Optional |
| `zed` | `.agents/skills/<slug>/SKILL.md` | `~/.agents/skills/<slug>/SKILL.md` | Yes (Primary) | No | No (uses canonical) |
| `windsurf` | `.wind
