import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // The download route reads the .md files at request time; ship them with its server bundle.
  outputFileTracingIncludes: {
    "/prompts/[slug]/download": ["./content/prompts/**/*"],
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

export default nextConfig;
