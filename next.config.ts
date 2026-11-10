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
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
