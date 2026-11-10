import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolves the `@/*` alias from tsconfig.json (built into Vite 8).
  resolve: { tsconfigPaths: true },
  test: {
    // Unit tests of plain TypeScript (validation, form classes, helpers). Switch a file to jsdom
    // with a `// @vitest-environment jsdom` comment once components are tested.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
