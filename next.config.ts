import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // These routes read the .md files at request time; ship them with their server bundles.
  outputFileTracingIncludes: {
    "/[locale]/prompts/[slug]/download": ["./content/prompts/**/*"],
    "/api/v1/prompts/[slug]": ["./content/prompts/**/*"],
    "/api/v1/prompts/[slug]/file": ["./content/prompts/**/*"],
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
