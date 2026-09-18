import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@prisma/client",
    ".prisma/client",
    "@prisma/adapter-neon",
    "@prisma/adapter-pg",
    "@neondatabase/serverless",
    "bcryptjs",
    "pdf-lib",
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
