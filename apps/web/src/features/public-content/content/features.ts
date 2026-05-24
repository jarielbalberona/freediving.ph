export type FeaturePageContent = {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  eyebrow: string;
  href: `/features/${string}`;
  appHref: string;
  appLabel: string;
  summary: string;
  highlights: string[];
  sections: Array<{
    title: string;
    body: string;
  }>;
  relatedLinks: Array<{
    label: string;
    href: string;
    description: string;
  }>;
};

export const featurePages: FeaturePageContent[] = [
  {
    slug: "dive-spots",
    title: "Discover Freediving Spots in the Philippines",
    shortTitle: "Explore dive spots",
    description:
      "Find, browse, contribute, and tag freediving spots across the Philippines with community context.",
    eyebrow: "Explore",
    href: "/features/dive-spots",
    appHref: "/explore",
    appLabel: "Open Explore",
    summary:
      "Freediving Philippines gives the community a shared place to map dive spots, improve spot details, and connect photos and posts back to real places.",
    highlights: [
      "Browse public dive spots by location and community activity.",
      "Contribute missing spots for review instead of letting knowledge disappear in chat threads.",
      "Tag dive spots in media posts so future freedivers can find context faster.",
    ],
    sections: [
      {
        title: "Built for community discovery",
        body: "Dive spot knowledge in the Philippines is often scattered across group chats, captions, and word of mouth. The Explore surface turns that knowledge into a searchable public layer while keeping moderation in place.",
      },
      {
        title: "Connected to real activity",
        body: "Dive spots are not isolated directory entries. They can connect to posts, buddy plans, events, and future location guides so the page stays useful after the first visit.",
      },
    ],
    relatedLinks: [
      {
        label: "Explore dive spots",
        href: "/explore",
        description: "Browse the current public dive spot map and listings.",
      },
      {
        label: "Read upcoming guides",
        href: "/guides",
        description: "See the guide topics planned for new freedivers.",
      },
    ],
  },
  {
    slug: "buddy-finder",
    title: "Find Freediving Buddies Safely",
    shortTitle: "Find dive buddies",
    description:
      "Connect with other freedivers intentionally before training, fun dives, and local trips.",
    eyebrow: "Buddy Finder",
    href: "/features/buddy-finder",
    appHref: "/buddies",
    appLabel: "Find buddies",
    summary:
      "Buddy Finder helps freedivers signal availability, interests, and preferred dive spots without forcing every plan into noisy social feeds.",
    highlights: [
      "Find people planning dives, training, or fun dives.",
      "Use profiles and dive spot context before reaching out.",
      "Keep buddy discovery tied to the safety reality that freediving should not be done alone.",
    ],
    sections: [
      {
        title: "Intent matters",
        body: "A useful buddy finder is not just a list of usernames. It should help people understand who is available, where they want to dive, and whether the plan makes sense.",
      },
      {
        title: "Profiles add context",
        body: "Public profiles give freedivers a place to show experience, activity, and community signals before someone starts a conversation.",
      },
    ],
    relatedLinks: [
      {
        label: "Open Buddy Finder",
        href: "/buddies",
        description: "Look for freedivers and dive plans.",
      },
      {
        label: "Join Freediving Philippines",
        href: "/sign-up",
        description: "Create a profile before connecting with other members.",
      },
    ],
  },
  {
    slug: "events",
    title: "Discover Freediving Events",
    shortTitle: "Join freediving events",
    description:
      "Find freediving competitions, cleanups, meetups, training days, and community activities in the Philippines.",
    eyebrow: "Events",
    href: "/features/events",
    appHref: "/events",
    appLabel: "Browse events",
    summary:
      "Events give organizers and freedivers a public place to share what is happening, who it is for, and how the community can join.",
    highlights: [
      "Browse public freediving events and community activities.",
      "Follow event details without losing updates in social timelines.",
      "Support future organizer tools for payments, check-ins, updates, and event passes.",
    ],
    sections: [
      {
        title: "A clearer public event surface",
        body: "Freediving activities need more than a poster screenshot. Event pages can carry dates, locations, organizer context, updates, and links back to the community.",
      },
      {
        title: "Useful before and after the event",
        body: "The event layer is designed to connect with groups, dive spots, official updates, and posts so events can remain useful beyond the announcement.",
      },
    ],
    relatedLinks: [
      {
        label: "Browse events",
        href: "/events",
        description: "See public events and activities listed today.",
      },
      {
        label: "Explore dive spots",
        href: "/explore",
        description: "Find places connected to future meetups and trips.",
      },
    ],
  },
  {
    slug: "groups",
    title: "Join Freediving Groups and Local Communities",
    shortTitle: "Join groups",
    description:
      "Find freediving clubs, local communities, and interest groups across the Philippines.",
    eyebrow: "Groups",
    href: "/features/groups",
    appHref: "/groups",
    appLabel: "Browse groups",
    summary:
      "Groups help local communities, clubs, and shared-interest circles stay discoverable without replacing how they already organize offline.",
    highlights: [
      "Browse public freediving groups and communities.",
      "Connect group activity with events, Chika discussions, and members.",
      "Give local communities a more durable home than one-off announcement posts.",
    ],
    sections: [
      {
        title: "Local communities stay visible",
        body: "A group page should make it easier to find the right people while still respecting private or invite-only communities where needed.",
      },
      {
        title: "Not a replacement for real community",
        body: "Freediving Philippines is a discovery and coordination layer. The goal is to support clubs and local groups, not absorb them.",
      },
    ],
    relatedLinks: [
      {
        label: "Browse groups",
        href: "/groups",
        description: "Find public groups and local freediving communities.",
      },
      {
        label: "Read Chika",
        href: "/chika",
        description: "Join community discussions around topics and updates.",
      },
    ],
  },
  {
    slug: "chika",
    title: "Chika for the Philippine Freediving Community",
    shortTitle: "Chika discussions",
    description:
      "A community discussion space for freedivers in the Philippines to ask, share, and coordinate.",
    eyebrow: "Chika",
    href: "/features/chika",
    appHref: "/chika",
    appLabel: "Open Chika",
    summary:
      "Chika gives freedivers a place for community threads, questions, updates, suggestions, and conversations that should remain easier to find than social media comments.",
    highlights: [
      "Read public freediving community discussions.",
      "Ask questions and share context without burying it in short-lived feeds.",
      "Connect discussions back to events, groups, dive spots, and profiles.",
    ],
    sections: [
      {
        title: "Public threads with community context",
        body: "Good community discussion needs durable links, readable threads, and a structure that can connect to the rest of the app.",
      },
      {
        title: "Useful for feedback too",
        body: "Chika is also where the community can suggest improvements and help shape which product gaps matter most.",
      },
    ],
    relatedLinks: [
      {
        label: "Open Chika",
        href: "/chika",
        description: "Read current public community threads.",
      },
      {
        label: "Find groups",
        href: "/groups",
        description: "Connect discussions with local communities.",
      },
    ],
  },
  {
    slug: "schools-and-courses",
    title: "Find Freediving Schools, Instructors, and Courses",
    shortTitle: "Schools and courses",
    description:
      "Browse freediving schools, verified instructors, courses, and sessions in the Philippines.",
    eyebrow: "Schools",
    href: "/features/schools-and-courses",
    appHref: "/schools",
    appLabel: "Browse schools",
    summary:
      "The schools layer helps new and returning freedivers find instructors, courses, sessions, and booking paths with clearer public information.",
    highlights: [
      "Browse public school and course listings as they become available.",
      "Support instructor profiles and verification workflows.",
      "Connect training options with location, community, and event context.",
    ],
    sections: [
      {
        title: "Training discovery should be clearer",
        body: "People starting freediving need credible paths to instruction, not scattered screenshots and outdated posts.",
      },
      {
        title: "A foundation for bookings",
        body: "Schools, instructors, courses, and sessions are already app concepts. The public content layer should point users toward those real surfaces instead of pretending to be a separate directory.",
      },
    ],
    relatedLinks: [
      {
        label: "Browse schools",
        href: "/schools",
        description: "Find public school listings and course information.",
      },
      {
        label: "Apply as an instructor",
        href: "/instructor/apply",
        description: "Start the instructor profile and verification flow.",
      },
    ],
  },
];

export const featurePageBySlug = new Map(
  featurePages.map((feature) => [feature.slug, feature]),
);

export function getFeaturePage(slug: string): FeaturePageContent {
  const feature = featurePageBySlug.get(slug);
  if (!feature) {
    throw new Error(`Missing public feature content for ${slug}`);
  }
  return feature;
}
