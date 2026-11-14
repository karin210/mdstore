# Commit messages without AI attribution

Keeps commit messages, pull request texts and release notes free of credits to an AI assistant, so the history only describes the change. Follow it whenever you create, amend or squash a commit, write a pull request title or description, or find that a tool, template or hook has added a line of its own to a message.

- **The project's policy wins.** If the project or the user asks for AI assistance to be disclosed, follow that policy instead and say so. Without such a policy, this file applies.
- **The message describes the change, nothing else.** What changed and why, written for the next developer who reads the history.
- **Strip, don't argue.** When an attribution line appears, remove it silently and carry on. Don't add a note about it.
- **Re-read this file in long sessions.** If the conversation has been compacted or summarised, or you've been working for a long stretch, re-read this file before the next change and check your work against it.

## 1. What never goes into a message

No credit of any kind to an assistant, a model or a tool:

- A `Co-Authored-By:` trailer naming an assistant, a model or a tool.
- A "Generated with…", "Written by…" or "Assisted by…" line, with or without an emoji or a link.
- A session, conversation or run footer or link (`Session:`, `Chat:`, `Agent-Run:`).
- A badge or signature block in a pull request description that credits an assistant.

This holds even when the line comes from somewhere else: an agent's default commit template, a commit-message generator, an editor integration or a git hook. Remove it before the commit is created.

## 2. What stays

- **Trailers for people.** A `Co-Authored-By:` for a real person who worked on the change is fine when the user asks for it. So are `Signed-off-by:` lines required by the project's contribution rules and issue references (`Fixes #123`).
- **The reasoning.** Why a non-obvious decision was taken belongs in the body of the message. That is documentation, not attribution.

## 3. How to write the message

- **Subject:** imperative mood, no trailing period, about 50 characters and never more than 72 ("Add rate limiting to the login route").
- **Blank line, then a body** when the change needs context: what the problem was, why this approach, what was left out. Wrap at about 72 characters.
- **One logical change per commit.** If the subject needs "and", consider two commits.
- **Follow the project's convention** if it has one (Conventional Commits, a ticket prefix, a language). Match the recent history: read `git log --oneline -15` first.

## 4. Check before committing

Look at the message you are about to create, including anything a template or hook adds. After committing, print it:

```sh
git log -1 --format=%B
```

If an attribution line got in:

- **Not pushed yet:** rewrite it with `git commit --amend` (last commit) or an interactive rebase reword (older ones).
- **Already pushed:** don't rewrite shared history on your own. Tell the user and let them decide.

## 5. Enforce it with a hook (optional)

A `commit-msg` hook rejects any message that carries an attribution line, whoever or whatever wrote it. Save it as `.git/hooks/commit-msg` and make it executable:

```sh
#!/bin/sh
# Rejects commit messages that credit an AI assistant.
if grep -iqE '^(co-authored-by:.*(claude|copilot|chatgpt|gpt|openai|gemini|cursor|aider|codex|anthropic)|(generated|written|assisted) (with|by) |session:)' "$1"; then
  echo "Commit message credits an AI assistant. Remove that line and commit again." >&2
  exit 1
fi
```

To share it with the team, keep the script in the repository and point `core.hooksPath` at its folder.

## 6. Examples

Instead of:

```text
Fix double submit on the booking form

Generated with an AI assistant

Co-Authored-By: Some Assistant <assistant@example.com>
```

Write:

```text
Fix double submit on the booking form

The submit button stayed enabled while the request was in flight, so a
second click created a duplicate booking. Disable it until the request
settles and keep its width fixed so the label change doesn't shift the
layout.
```
