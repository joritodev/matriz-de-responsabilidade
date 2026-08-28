import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@matriz/core", "@matriz/db", "@matriz/config", "@matriz/shared"],
  serverExternalPackages: ["postgres", "pino", "bcryptjs"],
  typedRoutes: false,
};

export default nextConfig;
