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
