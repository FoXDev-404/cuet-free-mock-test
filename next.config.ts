import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  partialPrefetching: false,
  serverExternalPackages: ["@prisma/adapter-d1", "@prisma/client", ".prisma/client"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
