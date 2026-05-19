import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

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

const hasSentrySourceMapUpload =
  Boolean(process.env.SENTRY_AUTH_TOKEN) &&
  Boolean(process.env.SENTRY_ORG) &&
  Boolean(process.env.SENTRY_PROJECT);

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  telemetry: false,
  sourcemaps: {
    disable: !hasSentrySourceMapUpload,
    deleteSourcemapsAfterUpload: true,
  },
  release: {
    name: process.env.SENTRY_RELEASE,
    create: hasSentrySourceMapUpload,
  },
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
  },
});
