import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

loadEnvConfig(path.resolve(__dirname, "../.."));

const nextConfig: NextConfig = {
  transpilePackages: ["@matriz/core", "@matriz/db", "@matriz/config", "@matriz/shared"],
  serverExternalPackages: ["postgres", "pino", "bcryptjs"],
  typedRoutes: false,
};

export default nextConfig;
