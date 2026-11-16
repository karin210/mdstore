import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Unit tests of plain TypeScript, in the Node environment. Switch a file to jsdom with a
    // `// @vitest-environment jsdom` comment once components are tested.
    environment: "node",
    projects: [
      {
        extends: true,
        // Resolves the site's `@/*` alias from tsconfig.json (built into Vite 8).
        resolve: { tsconfigPaths: true },
        // The site: validation, form classes, helpers.
        test: { name: "site", include: ["src/**/*.test.ts"] },
      },
      {
        extends: true,
        // The CLI (packages/cli): targets, lockfile, path safety, hashes. Relative imports only.
        test: { name: "cli", include: ["packages/cli/src/**/*.test.ts"] },
      },
    ],
  },
});
