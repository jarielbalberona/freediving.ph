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
      "Freediving Philippines helps people discover dive spots, share useful local details, and connect photos or posts back to the places where they were made.",
    highlights: [
      "Browse public dive spots by location and community activity.",
      "Contribute missing spots for review instead of letting knowledge disappear in chat threads.",
      "Tag dive spots in media posts so future freedivers can find context faster.",
    ],
    sections: [
      {
        title: "Find local knowledge faster",
        body: "Dive spot knowledge in the Philippines is often scattered across group chats, captions, and word of mouth. Explore gives the community a clearer place to collect useful details while keeping review and moderation in place.",
      },
      {
        title: "See what is happening around a place",
        body: "A dive spot is more useful when it connects to photos, buddy plans, events, and future location guides. That context helps new visitors understand more than just a pin on a map.",
      },
    ],
    relatedLinks: [
      {
        label: "Explore dive spots",
        href: "/explore",
        description: "Browse the current public dive spot map and listings.",
      },
      {
        label: "Read beginner guides",
        href: "/guides",
        description: "Read beginner guides before planning your next session.",
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
      "Buddy Finder helps freedivers share where they want to dive, what kind of session they are planning, and who might be a good match.",
    highlights: [
      "Find people planning dives, training, or fun dives.",
      "Use profiles and dive spot context before reaching out.",
      "Keep buddy discovery tied to the safety reality that freediving should not be done alone.",
    ],
    sections: [
      {
        title: "Intent matters",
        body: "A useful buddy match is more than a name. Before you plan a session, it helps to know where someone wants to dive, what they are comfortable with, and whether your goals fit.",
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
      "Events help freedivers find community dives, competitions, cleanups, meetups, school activities, and other ways to get involved.",
    highlights: [
      "Browse public freediving events and community activities.",
      "Follow event details without losing updates in social timelines.",
      "Keep track of organizer updates, event details, and what participants need to know.",
    ],
    sections: [
      {
        title: "More than a poster screenshot",
        body: "Freediving activities are easier to join when the date, location, organizer, requirements, and updates are easy to find in one place.",
      },
      {
        title: "Useful before and after the event",
        body: "Events can connect with groups, dive spots, organizer updates, and posts so people can prepare before they go and catch up afterward.",
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
        body: "Local groups should be easier to find while still respecting private or invite-only communities where needed.",
      },
      {
        title: "Not a replacement for real community",
        body: "Freediving Philippines is here to help people find and coordinate with clubs and local groups, not replace the relationships they already have in the water.",
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
        body: "Good community discussion is easier when questions, answers, and recommendations can be found again later instead of disappearing in fast-moving comment sections.",
      },
      {
        title: "Useful for recommendations too",
        body: "Chika is also a place to ask for school recommendations, trip tips, gear advice, event questions, and local context from other freedivers.",
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
      "Schools and courses help new and returning freedivers find instruction, compare learning options, and choose a safer way to get started.",
    highlights: [
      "Browse school and course listings as they become available.",
      "Find instructor profiles and clearer learning options.",
      "Connect training options with location, community, and event context.",
    ],
    sections: [
      {
        title: "Training discovery should be clearer",
        body: "People starting freediving need credible paths to instruction, not scattered screenshots and outdated posts.",
      },
      {
        title: "Clearer paths to lessons",
        body: "Course pages, instructor profiles, and session details should help people understand what is offered, where it happens, what is included, and how to ask the right questions before booking.",
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
