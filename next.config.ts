import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Dev only: let phones on the local Wi-Fi load the dev server (http://192.168.x.x:3000).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  images: {
    loader: "custom",
    loaderFile: "./src/lib/imagekit-loader.ts",
  },
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
