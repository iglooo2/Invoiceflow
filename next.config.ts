import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  async redirects() {
    // Backup for the proxy aliases. OpenNext runs `proxy.ts` on Workers; these
    // cover a host that applies next.config redirects before or without it.
    const locales = "en|es|fr|de|pt";
    return [
      { source: "/register", destination: "/login?mode=register", permanent: false },
      { source: "/signup", destination: "/login?mode=register", permanent: false },
      {
        source: `/:locale(${locales})/register`,
        destination: "/:locale/login?mode=register",
        permanent: false,
      },
      {
        source: `/:locale(${locales})/signup`,
        destination: "/:locale/login?mode=register",
        permanent: false,
      },
    ];
  },
  serverExternalPackages: [
    "@prisma/client",
    ".prisma/client",
    "@prisma/adapter-neon",
    "@prisma/adapter-pg",
    "@neondatabase/serverless",
    "bcryptjs",
    "pg",
  ],
  // NFT does not follow Prisma's fs.readFileSync of the query compiler WASM.
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/.prisma/client/query_compiler_bg.wasm",
      "./node_modules/.prisma/client/query_compiler_bg.js",
      "./node_modules/.prisma/client/wasm-worker-loader.mjs",
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        "invoiceflowstudio.com",
        "www.invoiceflowstudio.com",
        "*.invoiceflowstudio.com",
        "*.workers.dev",
      ],
    },
  },
};

export default nextConfig;

initOpenNextCloudflareForDev();
