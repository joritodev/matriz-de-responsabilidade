import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tudo depende do login: as páginas são sempre dinâmicas, então Cache Components fica desligado.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
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
