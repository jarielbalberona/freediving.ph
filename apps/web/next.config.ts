import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.freediving.ph",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "freediving-ph-api.onrender.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.amazonaws.com",
        pathname: "/**",
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
  sentryUrl: process.env.SENTRY_URL || "https://app.glitchtip.com",
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
