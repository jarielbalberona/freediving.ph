import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/explore"],
      disallow: [
        "/api/",
        "/auth",
        "/messages",
        "/notifications",
        "/onboarding",
        "/profile",
        "/saved",
        "/settings",
        "/moderation",
        "/explore/submissions",
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
