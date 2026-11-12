import type { NextConfig } from "next";

/**
 * Deployed to two places, which want different base paths:
 *   - a root domain (applyr.unv.run, or a custom domain later) -> ""
 *   - GitHub Pages at ebub323.github.io/applyr           -> "/applyr"
 * Set BASE_PATH in the environment for the subpath case. Pointing a custom
 * domain at Pages later means dropping the variable, not editing this file.
 */
const basePath = process.env.BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
};

export default nextConfig;
