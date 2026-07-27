import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Server actions receive the whole daily report in one payload.
    serverActions: { bodySizeLimit: "1mb" },
  },
};

export default nextConfig;
