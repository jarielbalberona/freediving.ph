import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "cdn.freediving.ph",
        port: "",
        pathname: "**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "freediving-ph-api.onrender.com",
        port: "",
        pathname: "**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "*.amazonaws.com",
        port: "",
        pathname: "**",
        search: "",
      },
    ],
  },
  // Render.com specific configuration
  output: "standalone",
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
