import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  output: "standalone",
  outputFileTracingIncludes: {
    "**/*": ["./src/generated/prisma/**/*"],
  },
};

export default nextConfig;
