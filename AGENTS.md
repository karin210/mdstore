<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## JavaScript naming: snake_case

- Write all JavaScript and TypeScript identifiers in `snake_case`: variables, functions, parameters, object keys, and file-level constants.
- Use `PascalCase` only for component and class names, because React and the language need it for JSX and constructors (e.g. `prompt_card` is written as `PromptCard` only when it is a component or class).
- Do not rename existing camelCase code as a side effect of other work. Apply the convention to new and touched code.
- Names that an outside system owns keep the outside system's spelling (Supabase columns, error codes, cookie names, Next.js and library APIs).
