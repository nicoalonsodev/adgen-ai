import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude native modules from bundling (required for sharp and @napi-rs/canvas)
  serverExternalPackages: ["sharp", "@napi-rs/canvas"],

  // Ensure font files are included in serverless function bundles on Vercel
  outputFileTracingIncludes: {
    "/api/**": ["./public/fonts/**"],
  },

  // Allow larger request bodies for image uploads (default is 10MB)
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
    middlewareClientMaxBodySize: "50mb",
  },
};

export default nextConfig;
