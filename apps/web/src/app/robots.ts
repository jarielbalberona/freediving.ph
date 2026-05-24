import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/about-us",
        "/features",
        "/guides",
        "/explore",
        "/buddies",
        "/chika",
        "/events",
        "/groups",
        "/schools",
      ],
      disallow: [
        "/api/",
        "/admin",
        "/auth",
        "/manage",
        "/messages",
        "/moderation",
        "/notifications",
        "/onboarding",
        "/profile",
        "/saved",
        "/settings",
        "/explore/submissions",
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
