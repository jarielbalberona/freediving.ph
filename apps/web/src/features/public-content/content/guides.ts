export type GuideStatus = "published" | "planned";

export type GuideContent = {
  slug: string;
  title: string;
  description: string;
  href: `/guides/${string}`;
  status: GuideStatus;
  publishedAt?: string;
  updatedAt?: string;
  readingTime?: string;
  sections?: Array<{
    title: string;
    body: string[];
  }>;
  relatedLinks?: Array<{
    label: string;
    href: string;
  }>;
};

export const guides: GuideContent[] = [
  {
    slug: "how-to-start-freediving-in-the-philippines",
    title: "How to Start Freediving in the Philippines",
    description:
      "A practical first-step guide for finding instruction, dive buddies, safety context, and beginner-friendly freediving community spaces in the Philippines.",
    href: "/guides/how-to-start-freediving-in-the-philippines",
    status: "published",
    publishedAt: "2026-05-24",
    updatedAt: "2026-05-24",
    readingTime: "5 min read",
    sections: [
      {
        title: "Start with proper instruction",
        body: [
          "Freediving is not a sport to learn from clips alone. Start with a qualified instructor or school that teaches breathing, equalization, rescue practice, buddy procedures, and conservative progression.",
          "If you are comparing schools, look for clear course details, instructor context, safety standards, location, schedule, and what is included in the session.",
        ],
      },
      {
        title: "Do not dive alone",
        body: [
          "The first rule worth taking seriously is simple: do not freedive alone. A buddy is not just company. They are part of the safety system.",
          "Use the Buddy Finder and public profiles to find people intentionally, then still apply real-world judgment before planning a session.",
        ],
      },
      {
        title: "Choose beginner-appropriate places",
        body: [
          "The Philippines has excellent freediving locations, but not every site is suitable for beginners on every day. Conditions, access, current, boat traffic, depth, and local guidance matter.",
          "Use Explore as a starting point, then confirm current conditions with local communities, instructors, or experienced buddies before entering the water.",
        ],
      },
      {
        title: "Join the community before you need it",
        body: [
          "Groups, events, and Chika discussions are useful before your first big trip. They help you learn local norms, find upcoming activities, and understand which questions people are already asking.",
          "Freediving Philippines is built to connect these surfaces so new freedivers can move from learning to meeting people to finding places without starting from zero every time.",
        ],
      },
    ],
    relatedLinks: [
      { label: "Explore dive spots", href: "/explore" },
      { label: "Find a dive buddy", href: "/buddies" },
      { label: "Browse schools", href: "/schools" },
      { label: "Join community discussions", href: "/chika" },
    ],
  },
  {
    slug: "freediving-safety-basics",
    title: "Freediving Safety Basics",
    description:
      "Planned guide covering buddy procedures, conservative progression, and common safety mistakes for new freedivers.",
    href: "/guides/freediving-safety-basics",
    status: "planned",
  },
  {
    slug: "what-to-bring-to-a-freediving-session",
    title: "What to Bring to a Freediving Session",
    description:
      "Planned checklist for beginner sessions, training days, and local freediving trips.",
    href: "/guides/what-to-bring-to-a-freediving-session",
    status: "planned",
  },
  {
    slug: "how-to-find-a-freediving-buddy",
    title: "How to Find a Freediving Buddy",
    description:
      "Planned guide for finding buddies with safety, expectations, and location context in mind.",
    href: "/guides/how-to-find-a-freediving-buddy",
    status: "planned",
  },
  {
    slug: "freediving-certifications-philippines",
    title: "Freediving Certifications in the Philippines",
    description:
      "Planned overview of certification paths, course selection, and instructor discovery.",
    href: "/guides/freediving-certifications-philippines",
    status: "planned",
  },
];

export const publishedGuides = guides.filter(
  (guide) => guide.status === "published",
);

export const guideBySlug = new Map(guides.map((guide) => [guide.slug, guide]));

export function getGuide(slug: string): GuideContent {
  const guide = guideBySlug.get(slug);
  if (!guide) {
    throw new Error(`Missing guide content for ${slug}`);
  }
  return guide;
}
