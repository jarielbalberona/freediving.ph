import { absoluteUrl, seoConfig } from "@/features/public-content/seo/metadata";

type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | JsonLdValue[]
  | { [key: string]: JsonLdValue };

export type JsonLdObject = { [key: string]: JsonLdValue };

export type BreadcrumbItem = {
  name: string;
  path: `/${string}`;
};

export type ArticleJsonLdInput = {
  title: string;
  description: string;
  path: `/${string}`;
  publishedAt: string;
  updatedAt?: string;
  authorName?: string;
  image?: string;
};

export function websiteJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: seoConfig.siteName,
    url: seoConfig.origin,
    description: seoConfig.defaultDescription,
    inLanguage: "en-PH",
    potentialAction: {
      "@type": "SearchAction",
      target: `${seoConfig.origin}/explore?query={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function organizationJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: seoConfig.siteName,
    url: seoConfig.origin,
    logo: `${seoConfig.origin}/images/fph-logo.png`,
    sameAs: [
      "https://www.facebook.com/freediving.ph",
      "https://www.instagram.com/freediving.ph",
    ],
  };
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function webPageJsonLd({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: `/${string}`;
}): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: absoluteUrl(path),
    isPartOf: {
      "@type": "WebSite",
      name: seoConfig.siteName,
      url: seoConfig.origin,
    },
  };
}

export function articleJsonLd({
  title,
  description,
  path,
  publishedAt,
  updatedAt,
  authorName = seoConfig.siteName,
  image = seoConfig.defaultImage,
}: ArticleJsonLdInput): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url: absoluteUrl(path),
    image,
    datePublished: publishedAt,
    dateModified: updatedAt ?? publishedAt,
    author: {
      "@type": "Organization",
      name: authorName,
    },
    publisher: {
      "@type": "Organization",
      name: seoConfig.siteName,
      logo: {
        "@type": "ImageObject",
        url: `${seoConfig.origin}/images/fph-logo.png`,
      },
    },
    inLanguage: "en-PH",
  };
}

export function jsonLdScript(data: JsonLdObject | JsonLdObject[]) {
  return {
    __html: JSON.stringify(data).replace(/</g, "\\u003c"),
  };
}
