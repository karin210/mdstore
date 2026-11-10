# Dev tools and stack advisor

Recommends the tools and stack that fit the project and the developer's setup: linter, formatter, test runner, package manager, framework or library. Follow it when a project starts, when the user asks which tool to use or asks you to run this advisor, or when the current tooling keeps causing friction. It works with any AI agent, editor, operating system and language: detect the setup, never assume it.

- **The user's choice wins.** When the user has already chosen a tool, or names the one they want, use it and set it up well instead of arguing for another. If it has a serious problem (abandoned, incompatible with their versions, insecure), say so once, then follow their decision. Decisions recorded in the project's instruction files count as the user's choice.
- **Recommend, don't install.** Return a recommendation; install only after the user approves it.
- **The codebase wins.** In a project in progress, a working setup stays unless the gain is clear.
- **Research, don't remember.** Tools change fast: check their current docs before recommending them.

## 0. The request

- **A specific question** (e.g. "which test runner should I use?"): research only that kind of tool.
- **A general request** (e.g. "run the dev tools advisor", "review my tooling"):
  - **In an existing project**, go through every kind of tool the project uses or lacks (package manager, runtime version, formatter, linter, type checker, test runner, framework version) and return one prioritized list: what to keep, what to change and what is missing.
  - **In an empty folder**, ask what the user is building, then recommend a starting stack.

## 1. The developer's setup

Look for a saved profile first: an "Environment" section in the user-level or project instruction files you read. If there is none, detect what you can:

- **Operating system and shell:** from the environment you run in.
- **Editor:** from editor config folders in the repo or home directory, or from the tool you run in.
- **Runtime version manager:** from its config files in the repo (for example `.tool-versions`, `.nvmrc`, `.python-version`, `rust-toolchain.toml`).

Ask only for what is still missing, in one short round of questions with the common options listed. Then offer to save the answers as an "Environment" section in the user-level instructions file of the agent the user works with, so other projects don't ask again.

## 2. The project's setup

Read it from the repo; never ask for what the files already say:

- **Manifest and lockfile:** the language, the framework and their versions, and the package manager (the lockfile identifies it).
- **Existing tool configs:** linter, formatter, type checker and test runner configuration files.
- **Scripts, CI workflows and monorepo setup** (workspaces, task runners).
- **Recorded decisions:** a stack decision already written in the project's instruction files stands unless the user reopens it.

Ask only about what can't be read and would change the recommendation: team size and whether teammates share the config, the deploy target, and priorities (speed, fewer dependencies, strictness).

## 3. Research the options

- **Current docs**, in this order: docs bundled with the installed packages, a documentation tool if one is available to you, then the official site. Check what the framework officially supports or recommends (official presets, plugins, scaffold options).
- **Maintenance:** recent releases and active issue triage; never recommend an abandoned tool.
- **Editor and OS fit:** an official integration for the user's editor (format on save, inline diagnostics) and known issues on their operating system (paths, line endings, shell syntax).

## 4. Compare

Judge every option by:

- **Compatibility** with the language, the framework and their versions.
- **Simplicity:** fewer tools, configs and dependencies win when the result is similar.
- **Editor and OS integration** for this developer.
- **Speed and maintenance.**
- **Migration cost** in a project in progress: the files, scripts and CI steps it would touch.

## 5. Deliver the recommendation

Keep it short:

- **Recommendation:** one tool, with two or three reasons tied to this project.
- **Alternative:** one option, and when it would be the better choice.
- **Trade-offs:** what the user gives up.
- **Migration** (projects in progress): what changes and what gets removed.
- **Steps:** exact commands in the user's shell syntax, through their package manager and version manager, plus the config files and editor setup.

After the user approves: install, configure, and run the tool once to confirm it works (lint, format check or tests).

## 6. Record the decision

Add one line to the project's instruction file (its stack section) with the tool and the reason, so later sessions don't reopen it.
