import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude native modules from bundling (required for @napi-rs/canvas)
  serverExternalPackages: ["@napi-rs/canvas"],

  // Allow larger request bodies for image uploads (default is 10MB)
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
    middlewareClientMaxBodySize: "50mb",
  },
};

export default nextConfig;
