import { absoluteUrl, seoConfig } from "@/features/public-content/seo/metadata";

type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | JsonLdValue[]
  | { [key: string]: JsonLdValue };

export type JsonLdObject = { [key: string]: JsonLdValue };
type LooseJsonLdObject = { [key: string]: JsonLdValue | undefined };

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

export type PlaceJsonLdInput = {
  name: string;
  description: string;
  path: `/${string}`;
  address?: string;
  latitude?: number;
  longitude?: number;
  image?: string;
};

export type EventJsonLdInput = {
  name: string;
  description: string;
  path: `/${string}`;
  startDate?: string;
  endDate?: string;
  locationName?: string;
  address?: string;
  image?: string;
};

export type OrganizationJsonLdInput = {
  name: string;
  description: string;
  path: `/${string}`;
  address?: string;
  url?: string;
  sameAs?: string[];
};

export type PersonJsonLdInput = {
  name: string;
  description: string;
  path: `/${string}`;
  location?: string;
  url?: string;
  sameAs?: string[];
};

export type DiscussionJsonLdInput = {
  headline: string;
  text: string;
  path: `/${string}`;
  datePublished?: string;
  dateModified?: string;
  authorName?: string;
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

export function placeJsonLd({
  name,
  description,
  path,
  address,
  latitude,
  longitude,
  image = seoConfig.defaultImage,
}: PlaceJsonLdInput): JsonLdObject {
  return removeEmpty({
    "@context": "https://schema.org",
    "@type": "Place",
    name,
    description,
    url: absoluteUrl(path),
    image,
    address,
    geo:
      typeof latitude === "number" && typeof longitude === "number"
        ? {
            "@type": "GeoCoordinates",
            latitude,
            longitude,
          }
        : undefined,
  });
}

export function eventJsonLd({
  name,
  description,
  path,
  startDate,
  endDate,
  locationName,
  address,
  image = seoConfig.defaultImage,
}: EventJsonLdInput): JsonLdObject {
  return removeEmpty({
    "@context": "https://schema.org",
    "@type": "Event",
    name,
    description,
    url: absoluteUrl(path),
    image,
    startDate,
    endDate,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location:
      locationName || address
        ? removeEmpty({
            "@type": "Place",
            name: locationName || address,
            address,
          })
        : undefined,
  });
}

export function localBusinessJsonLd({
  name,
  description,
  path,
  address,
  url,
  sameAs,
}: OrganizationJsonLdInput): JsonLdObject {
  return removeEmpty({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name,
    description,
    url: url || absoluteUrl(path),
    address,
    sameAs,
  });
}

export function personJsonLd({
  name,
  description,
  path,
  location,
  url,
  sameAs,
}: PersonJsonLdInput): JsonLdObject {
  return removeEmpty({
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    description,
    url: url || absoluteUrl(path),
    homeLocation: location
      ? {
          "@type": "Place",
          name: location,
        }
      : undefined,
    sameAs,
  });
}

export function discussionForumPostingJsonLd({
  headline,
  text,
  path,
  datePublished,
  dateModified,
  authorName,
}: DiscussionJsonLdInput): JsonLdObject {
  return removeEmpty({
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    headline,
    text,
    url: absoluteUrl(path),
    datePublished,
    dateModified,
    author: authorName
      ? {
          "@type": "Person",
          name: authorName,
        }
      : undefined,
  });
}

export function jsonLdScript(data: JsonLdObject | JsonLdObject[]) {
  return {
    __html: JSON.stringify(data).replace(/</g, "\\u003c"),
  };
}

function removeEmpty(value: LooseJsonLdObject): JsonLdObject {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => {
      if (item === undefined || item === null || item === "") return false;
      if (Array.isArray(item) && item.length === 0) return false;
      return true;
    }),
  ) as JsonLdObject;
}
