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

export function buildPublicMetadata({
  title,
  description,
  path,
  image = seoConfig.defaultImage,
  type = "website",
  noindex = false,
}: PublicSeoInput): Metadata {
  const canonical = absoluteUrl(path);

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type,
      locale: seoConfig.locale,
      url: canonical,
      siteName: seoConfig.siteName,
      title,
      description,
      images: [
        {
          url: image,
          width: 5000,
          height: 2625,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
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
