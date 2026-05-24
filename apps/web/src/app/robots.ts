import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { privateRoutePrefixes } from "@/features/public-content/seo/routes";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/about-us",
        "/features",
        "/freediving",
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
        ...privateRoutePrefixes,
        "/sign-in",
        "/sign-up",
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
