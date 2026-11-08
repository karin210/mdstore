import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // The download route reads the .md files at request time; ship them with its server bundle.
  outputFileTracingIncludes: {
    "/[locale]/prompts/[slug]/download": ["./content/prompts/**/*"],
  },
  turbopack: {
    rules: {
      "*.css": {
        // CSS Modules must keep their default handling, or their class names resolve to undefined.
        condition: { not: { path: /\.module\.css$/ } },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
