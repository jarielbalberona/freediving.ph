import { aboutContent } from "@/features/public-content/content/about";
import {
  type FeaturePageContent,
  featurePages,
  getFeaturePage,
} from "@/features/public-content/content/features";
import {
  type GuideContent,
  guideBySlug,
  publishedGuides,
} from "@/features/public-content/content/guides";
import {
  getLocation,
  type PublicLocationContent,
  locationBySlug,
  locationPages,
} from "@/features/public-content/content/locations";

import type { MarkdownDocument, MarkdownLink } from "./markdown";

export type AiReadableEntry = {
  title: string;
  description: string;
  htmlPath: `/${string}`;
  markdownPath: `/${string}.md`;
  section: "Features" | "Guides" | "Freediving locations" | "About";
};

export const aiReadableEntries: AiReadableEntry[] = [
  {
    title: "Freediving Philippines features",
    description:
      "Dive spots, buddies, events, groups, Chika, schools, instructors, and courses.",
    htmlPath: "/features",
    markdownPath: "/features.md",
    section: "Features",
  },
  ...featurePages.map((feature) => ({
    title: feature.title,
    description: feature.description,
    htmlPath: feature.href,
    markdownPath: `${feature.href}.md` as `/${string}.md`,
    section: "Features" as const,
  })),
  {
    title: "Freediving guides in the Philippines",
    description:
      "Beginner-friendly guides for safety, gear, buddies, certifications, and local conditions.",
    htmlPath: "/guides",
    markdownPath: "/guides.md",
    section: "Guides",
  },
  ...publishedGuides.map((guide) => ({
    title: guide.title,
    description: guide.description,
    htmlPath: guide.href,
    markdownPath: `${guide.href}.md` as `/${string}.md`,
    section: "Guides" as const,
  })),
  {
    title: "Freediving locations in the Philippines",
    description:
      "Location pages for planning freediving around the Philippines with local context and safety reminders.",
    htmlPath: "/freediving",
    markdownPath: "/freediving.md",
    section: "Freediving locations",
  },
  ...locationPages.map((location) => ({
    title: location.title,
    description: location.description,
    htmlPath: location.href,
    markdownPath: `${location.href}.md` as `/${string}.md`,
    section: "Freediving locations" as const,
  })),
  {
    title: aboutContent.title,
    description: aboutContent.description,
    htmlPath: aboutContent.href,
    markdownPath: "/about-us.md",
    section: "About",
  },
];

export function getMarkdownAlternatePath(
  path: `/${string}`,
): `/${string}.md` | undefined {
  return aiReadableEntries.find((entry) => entry.htmlPath === path)?.markdownPath;
}

export function getFeatureMarkdown(slug?: string): MarkdownDocument | null {
  if (!slug) return buildFeatureIndexMarkdown();
  const feature = safeGetFeature(slug);
  return feature ? buildFeatureMarkdown(feature) : null;
}

export function getGuideMarkdown(slug?: string): MarkdownDocument | null {
  if (!slug) return buildGuideIndexMarkdown();
  const guide = guideBySlug.get(slug);
  if (!guide || guide.status !== "published") return null;
  return buildGuideMarkdown(guide);
}

export function getLocationMarkdown(slug?: string): MarkdownDocument | null {
  if (!slug) return buildLocationIndexMarkdown();
  const location = locationBySlug.get(slug);
  return location ? buildLocationMarkdown(location) : null;
}

export function getAboutMarkdown(): MarkdownDocument {
  return {
    title: aboutContent.title,
    description: aboutContent.description,
    canonicalPath: aboutContent.href,
    sections: [
      {
        title: aboutContent.heroTitle,
        body: [aboutContent.heroDescription],
      },
      ...aboutContent.sections,
    ],
    links: aboutContent.links.map((link) => ({
      label: link.label,
      href: link.href,
      description: link.body,
    })),
  };
}

function buildFeatureIndexMarkdown(): MarkdownDocument {
  return {
    title: "Freediving Philippines features",
    description:
      "Discover dive spots, meet freediving buddies, join events and groups, ask questions, and find schools or courses around the Philippines.",
    canonicalPath: "/features",
    sections: [
      {
        title: "What you can do",
        body: [
          "Freediving Philippines brings together the practical things freedivers need around the country: places to explore, people to meet, activities to join, questions to ask, and schools to learn from.",
        ],
      },
      ...featurePages.map((feature) => ({
        title: feature.shortTitle,
        body: [feature.description, feature.summary],
        bullets: feature.highlights,
        links: [
          {
            label: "Read more",
            href: feature.href,
          },
          {
            label: feature.appLabel,
            href: feature.appHref,
          },
        ],
      })),
    ],
    links: [
      { label: "Read guides", href: "/guides" },
      { label: "Explore dive spots", href: "/explore" },
    ],
  };
}

function buildFeatureMarkdown(feature: FeaturePageContent): MarkdownDocument {
  return {
    title: feature.title,
    description: feature.description,
    canonicalPath: feature.href,
    sections: [
      {
        title: feature.eyebrow,
        body: [feature.summary],
        bullets: feature.highlights,
      },
      ...feature.sections.map((section) => ({
        title: section.title,
        body: [section.body],
      })),
    ],
    links: [
      { label: feature.appLabel, href: feature.appHref },
      { label: "See all features", href: "/features" },
      ...filterSafeLinks(feature.relatedLinks),
    ],
  };
}

function buildGuideIndexMarkdown(): MarkdownDocument {
  return {
    title: "Freediving guides in the Philippines",
    description:
      "Start with beginner-friendly guides on safety, gear, buddies, certifications, and local conditions in the Philippines.",
    canonicalPath: "/guides",
    sections: [
      {
        title: "Start learning with practical guides",
        body: [
          "These guides are written for people who want safer, clearer next steps before joining sessions, choosing courses, meeting buddies, or planning travel around the Philippines.",
        ],
      },
      ...publishedGuides.map((guide) => ({
        title: guide.title,
        body: [guide.description],
        links: [{ label: "Read the guide", href: guide.href }],
      })),
    ],
    links: [
      { label: "Explore dive spots", href: "/features/dive-spots" },
      { label: "Find schools and courses", href: "/features/schools-and-courses" },
      { label: "Find a dive buddy", href: "/features/buddy-finder" },
    ],
  };
}

function buildGuideMarkdown(guide: GuideContent): MarkdownDocument {
  return {
    title: guide.title,
    description: guide.description,
    canonicalPath: guide.href,
    sections:
      guide.sections?.map((section) => ({
        title: section.title,
        body: section.body,
        bullets: section.bullets,
        checklist: section.checklist,
        links: section.links,
      })) ?? [],
    links: guide.relatedLinks,
  };
}

function buildLocationIndexMarkdown(): MarkdownDocument {
  return {
    title: "Freediving locations in the Philippines",
    description:
      "Plan freediving around the Philippines with local context, beginner guides, dive spot discovery, buddies, events, and schools.",
    canonicalPath: "/freediving",
    sections: [
      {
        title: "Plan with local context",
        body: [
          "Freediving in the Philippines changes by island, season, tide, wind, current, access, and local rules. Use these pages as a starting point, then confirm conditions with local schools, organizers, groups, or experienced buddies.",
        ],
      },
      ...locationPages.map((location) => ({
        title: location.title,
        body: [location.description, location.intro],
        links: [{ label: `Read about ${location.name}`, href: location.href }],
      })),
    ],
    links: [
      { label: "Explore dive spots", href: "/explore" },
      { label: "Read safety basics", href: "/guides/freediving-safety-basics" },
      { label: "Browse events", href: "/events" },
    ],
  };
}

function buildLocationMarkdown(
  location: PublicLocationContent,
): MarkdownDocument {
  return {
    title: location.title,
    description: location.description,
    canonicalPath: location.href,
    sections: [
      {
        title: "Overview",
        body: [location.intro],
        bullets: location.highlights,
      },
      {
        title: "Best for",
        bullets: location.bestFor,
      },
      {
        title: "Safety notes",
        bullets: location.safetyNotes,
      },
      {
        title: "Getting started",
        bullets: location.gettingStartedTips,
      },
    ],
    links: buildLocationLinks(location),
  };
}

function buildLocationLinks(location: PublicLocationContent): MarkdownLink[] {
  const relatedGuides = location.relatedGuideSlugs
    .map((slug) => guideBySlug.get(slug))
    .filter((guide): guide is GuideContent => Boolean(guide))
    .map((guide) => ({ label: guide.title, href: guide.href }));

  const nearbyLocations = location.nearbyLocationSlugs
    .map((slug) => getLocation(slug))
    .map((nearbyLocation) => ({
      label: nearbyLocation.title,
      href: nearbyLocation.href,
    }));

  return [
    { label: "Explore dive spots", href: "/explore" },
    { label: "Dive spot discovery", href: "/features/dive-spots" },
    { label: "Find a dive buddy", href: "/features/buddy-finder" },
    { label: "Browse events", href: "/features/events" },
    { label: "Find schools and courses", href: "/features/schools-and-courses" },
    ...relatedGuides,
    ...nearbyLocations,
  ];
}

function filterSafeLinks(links: MarkdownLink[] = []): MarkdownLink[] {
  return links.filter(
    (link) =>
      ![
        "/admin",
        "/auth",
        "/messages",
        "/settings",
        "/sign-in",
        "/sign-up",
        "/profile",
        "/manage",
      ].some((prefix) => link.href === prefix || link.href.startsWith(`${prefix}/`)),
  );
}

function safeGetFeature(slug: string): FeaturePageContent | null {
  try {
    return getFeaturePage(slug);
  } catch {
    return null;
  }
}
