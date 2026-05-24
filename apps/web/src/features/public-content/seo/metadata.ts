import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

export const seoConfig = {
  siteName: siteConfig.name,
  origin: siteConfig.url,
  defaultDescription:
    "Freediving Philippines helps freedivers discover dive spots, find buddies, join events, and connect with the local freediving community.",
  defaultImage: siteConfig.ogImage,
  locale: "en_PH",
};

export type PublicSeoInput = {
  title: string;
  description: string;
  path: `/${string}`;
  image?: string;
  type?: "website" | "article";
  noindex?: boolean;
};

export const absoluteUrl = (path: `/${string}`): string =>
  `${seoConfig.origin}${path}`;

export const cleanSeoText = (value: string, fallback = ""): string =>
  value.replace(/\s+/g, " ").trim() || fallback;

export const truncateSeoDescription = (
  value: string,
  fallback = seoConfig.defaultDescription,
  maxLength = 160,
): string => {
  const cleaned = cleanSeoText(value, fallback);
  if (cleaned.length <= maxLength) return cleaned;
  const trimmed = cleaned.slice(0, maxLength - 1).trimEnd();
  const lastSpace = trimmed.lastIndexOf(" ");
  return `${trimmed.slice(0, lastSpace > 80 ? lastSpace : trimmed.length)}...`;
};

export function buildNoindexMetadata({
  title,
  description = seoConfig.defaultDescription,
  path,
}: {
  title: string;
  description?: string;
  path: `/${string}`;
}): Metadata {
  return buildPublicMetadata({
    title,
    description,
    path,
    noindex: true,
  });
}

export function buildPublicMetadata({
  title,
  description,
  path,
  image = seoConfig.defaultImage,
  type = "website",
  noindex = false,
}: PublicSeoInput): Metadata {
  const canonical = absoluteUrl(path);
  const cleanTitle = cleanSeoText(title, seoConfig.siteName);
  const cleanDescription = truncateSeoDescription(description);

  return {
    title: cleanTitle,
    description: cleanDescription,
    alternates: {
      canonical,
    },
    openGraph: {
      type,
      locale: seoConfig.locale,
      url: canonical,
      siteName: seoConfig.siteName,
      title: cleanTitle,
      description: cleanDescription,
      images: [
        {
          url: image,
          width: 5000,
          height: 2625,
          alt: cleanTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: cleanTitle,
      description: cleanDescription,
      images: [image],
    },
    robots: {
      index: !noindex,
      follow: true,
      googleBot: {
        index: !noindex,
        follow: true,
      },
    },
  };
}
