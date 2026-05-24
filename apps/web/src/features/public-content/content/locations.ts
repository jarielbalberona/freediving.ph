export type PublicLocationSlug =
  | "philippines"
  | "siquijor"
  | "batangas"
  | "cebu"
  | "dauin"
  | "apo-island"
  | "panglao"
  | "moalboal";

export type PublicLocationContent = {
  slug: PublicLocationSlug;
  name: string;
  regionLabel?: string;
  href: `/freediving/${PublicLocationSlug}`;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  highlights: string[];
  bestFor: string[];
  safetyNotes: string[];
  gettingStartedTips: string[];
  relatedGuideSlugs: string[];
  relatedFeatureSlugs: string[];
  nearbyLocationSlugs: PublicLocationSlug[];
  exploreQuery?: {
    search: string;
    label: string;
  };
};

export const locationPages: PublicLocationContent[] = [
  {
    slug: "philippines",
    name: "Philippines",
    href: "/freediving/philippines",
    title: "Freediving in the Philippines",
    description:
      "Plan freediving around the Philippines with local context, beginner guides, dive spot discovery, buddies, events, and schools.",
    metaTitle: "Freediving in the Philippines | Spots, Guides and Community",
    metaDescription:
      "Explore freediving in the Philippines with practical location guidance, dive spot discovery, safety basics, buddies, events, and schools.",
    intro:
      "The Philippines has island reefs, coastal training areas, marine sanctuaries, school communities, and weekend dive spots. Conditions are local, so the best plan starts with current guidance, a trained buddy, and respect for each place.",
    highlights: [
      "Island conditions vary by season, tide, wind, swell, current, access, and boat traffic.",
      "Beginner-friendly options are easier to find when you connect spots with schools, events, groups, and local communities.",
      "Freediving Philippines helps you move from scattered recommendations to safer planning and community context.",
    ],
    bestFor: [
      "Beginners comparing where to learn",
      "Travelers planning island freediving days",
      "Local freedivers looking for buddies, events, and groups",
      "Schools and organizers sharing reliable local context",
    ],
    safetyNotes: [
      "Never freedive alone. Dive with a trained buddy and agree on limits before entering the water.",
      "Ask local instructors, schools, groups, or organizers about current conditions before choosing a site.",
      "Respect marine protected areas, local rules, boat lanes, entry points, and community guidance.",
    ],
    gettingStartedTips: [
      "Start with a guided intro or beginner course if you are new.",
      "Use Explore to learn what places are already shared by the community.",
      "Read the safety and gear guides before joining a trip.",
      "Join events or groups when you want local context before traveling.",
    ],
    relatedGuideSlugs: [
      "how-to-start-freediving-in-the-philippines",
      "freediving-safety-basics",
      "best-time-to-freedive-in-the-philippines",
    ],
    relatedFeatureSlugs: [
      "dive-spots",
      "buddy-finder",
      "events",
      "schools-and-courses",
    ],
    nearbyLocationSlugs: [
      "siquijor",
      "batangas",
      "cebu",
      "dauin",
      "apo-island",
      "panglao",
      "moalboal",
    ],
    exploreQuery: {
      search: "Philippines",
      label: "Explore dive spots in the Philippines",
    },
  },
  {
    slug: "siquijor",
    name: "Siquijor",
    regionLabel: "Central Visayas",
    href: "/freediving/siquijor",
    title: "Freediving in Siquijor",
    description:
      "Plan freediving in Siquijor with local guidance, buddy safety, island conditions, and community dive spot discovery.",
    metaTitle: "Freediving in Siquijor | Dive Spots, Buddies and Guides",
    metaDescription:
      "Plan freediving in Siquijor with local context, safety reminders, dive spot discovery, buddy finding, and beginner guides.",
    intro:
      "Siquijor has the kind of island rhythm that attracts freedivers, travelers, and small community groups. Good sessions still depend on the day: access, current, visibility, weather, and local rules can change quickly.",
    highlights: [
      "A relaxed island setting can be beginner-friendly when paired with proper instruction and local guidance.",
      "Shore access, tides, and currents can vary around the island, so recent local advice matters.",
      "Siquijor works well for travelers who want community context before planning multiple water days.",
    ],
    bestFor: [
      "Travelers building freediving into an island trip",
      "Beginners looking for guided sessions before exploring",
      "Freedivers who want a slower community feel",
      "Buddy plans that stay conservative and conditions-aware",
    ],
    safetyNotes: [
      "Do not treat calm-looking water as automatically safe. Check entry, exit, current, depth, and boat movement.",
      "Dive with a trained buddy and stay within the least experienced diver's comfort zone.",
      "Ask local schools or community members which areas are appropriate for your level that day.",
    ],
    gettingStartedTips: [
      "Read the beginner guide before booking or joining a session.",
      "Use Explore to look for community-shared Siquijor spots.",
      "Connect with groups or buddies before planning a shore session.",
      "Bring simple gear, water, sun protection, and patience for weather changes.",
    ],
    relatedGuideSlugs: [
      "how-to-start-freediving-in-the-philippines",
      "freediving-safety-basics",
      "what-to-bring-to-a-freediving-session",
    ],
    relatedFeatureSlugs: ["dive-spots", "buddy-finder", "groups", "events"],
    nearbyLocationSlugs: ["dauin", "apo-island", "panglao", "cebu"],
    exploreQuery: {
      search: "Siquijor",
      label: "Explore Siquijor dive spots",
    },
  },
  {
    slug: "batangas",
    name: "Batangas",
    regionLabel: "Calabarzon",
    href: "/freediving/batangas",
    title: "Freediving in Batangas",
    description:
      "Find beginner-friendly context for freediving in Batangas, from weekend training to community dives near Metro Manila.",
    metaTitle: "Freediving in Batangas | Spots, Events and Community",
    metaDescription:
      "Explore freediving in Batangas with practical notes for weekend trips, training, schools, buddies, events, and local conditions.",
    intro:
      "Batangas is one of the most accessible freediving areas for people coming from Metro Manila. That makes it popular for weekend training, school sessions, fun dives, and community trips.",
    highlights: [
      "Accessible travel makes Batangas useful for regular practice and short weekend plans.",
      "Popular areas can also mean boat traffic, crowding, and changing conditions.",
      "Schools, instructors, and organized trips are often the safest first entry point for beginners.",
    ],
    bestFor: [
      "Metro Manila freedivers planning weekend sessions",
      "Beginner courses and intro sessions",
      "Community events, cleanups, and group trips",
      "Freedivers building consistent practice with buddies",
    ],
    safetyNotes: [
      "Check boat traffic, entry points, current, visibility, and local site rules before entering.",
      "Avoid rushing into deeper sessions because the location is familiar or easy to reach.",
      "If the area is busy, keep buddy communication extra clear and stay visible to surface support.",
    ],
    gettingStartedTips: [
      "Look for a school or instructor if this is your first open-water session.",
      "Browse events before the weekend so you can join organized community activity.",
      "Use Buddy Finder to align on goals, depth comfort, and timing before traveling.",
      "Pack for sun, traffic, wet gear, and a long ride home.",
    ],
    relatedGuideSlugs: [
      "freediving-safety-basics",
      "what-to-bring-to-a-freediving-session",
      "how-to-find-a-freediving-buddy",
    ],
    relatedFeatureSlugs: [
      "dive-spots",
      "events",
      "buddy-finder",
      "schools-and-courses",
    ],
    nearbyLocationSlugs: ["philippines"],
    exploreQuery: {
      search: "Batangas",
      label: "Explore Batangas dive spots",
    },
  },
  {
    slug: "cebu",
    name: "Cebu",
    regionLabel: "Central Visayas",
    href: "/freediving/cebu",
    title: "Freediving in Cebu",
    description:
      "Plan freediving in Cebu with realistic local context across a large province with different communities, coastlines, and conditions.",
    metaTitle: "Freediving in Cebu | Spots, Communities and Guides",
    metaDescription:
      "Explore freediving in Cebu with local context for communities, dive areas, conditions, buddies, events, schools, and beginner guides.",
    intro:
      "Cebu is not one single freediving profile. The province includes busy coastal towns, island trips, school communities, marine life encounters, and areas where conditions can change from one coast to another.",
    highlights: [
      "Cebu has several freediving areas, so local context matters more than broad province-level assumptions.",
      "Some places are better for learning, some for travel, and some for experienced local guidance.",
      "Community groups, schools, and events can help visitors avoid guessing from old travel posts.",
    ],
    bestFor: [
      "Travelers comparing Cebu freediving areas",
      "Freedivers looking for active communities and schools",
      "People planning around Moalboal or nearby island trips",
      "Local groups coordinating regular practice or events",
    ],
    safetyNotes: [
      "Check conditions by exact area, not only by province. Wind, swell, access, and current can differ widely.",
      "Respect local guidance around marine life, boat traffic, protected areas, and entry points.",
      "Do not chase photos or depth if the conditions or buddy setup are not right.",
    ],
    gettingStartedTips: [
      "Choose a specific area first, then ask local communities about current conditions.",
      "Read the best-time guide before planning a tight travel schedule.",
      "Use Explore and events together to see where activity is happening.",
      "If you are new, start with instruction instead of self-guided shore exploration.",
    ],
    relatedGuideSlugs: [
      "best-time-to-freedive-in-the-philippines",
      "freediving-safety-basics",
      "how-to-start-freediving-in-the-philippines",
    ],
    relatedFeatureSlugs: ["dive-spots", "groups", "events", "schools-and-courses"],
    nearbyLocationSlugs: ["moalboal", "panglao", "siquijor", "apo-island"],
    exploreQuery: {
      search: "Cebu",
      label: "Explore Cebu dive spots",
    },
  },
  {
    slug: "dauin",
    name: "Dauin",
    regionLabel: "Negros Oriental",
    href: "/freediving/dauin",
    title: "Freediving in Dauin",
    description:
      "Plan freediving in Dauin with local context for coastal access, nearby Apo Island trips, safety, buddies, and schools.",
    metaTitle: "Freediving in Dauin | Negros Oriental Spots and Guides",
    metaDescription:
      "Explore freediving in Dauin with practical notes on local guidance, coastal access, Apo Island connections, safety, buddies, and schools.",
    intro:
      "Dauin sits along a coast where local knowledge matters. It can connect well with nearby Apo Island plans, but shore access, boat plans, weather, and protected-area rules should shape every session.",
    highlights: [
      "Dauin can be a practical base for coastal sessions and nearby island planning.",
      "Local schools and guides are useful because conditions and access can vary by site.",
      "Apo Island plans should be treated as boat and weather dependent, not automatic.",
    ],
    bestFor: [
      "Travelers staying in Negros Oriental",
      "Freedivers planning around Dauin and Apo Island",
      "Beginners looking for guided local context",
      "Small buddy plans with flexible weather windows",
    ],
    safetyNotes: [
      "Confirm access, current, boat plans, and local rules before choosing a water entry.",
      "Do not assume nearby island conditions match the mainland coast.",
      "Use a trained buddy and local guidance, especially if you are unfamiliar with the area.",
    ],
    gettingStartedTips: [
      "Ask a local school or organizer which sites fit your level.",
      "Use Explore to check community-shared Dauin context.",
      "Build buffer into your schedule if you want to include Apo Island.",
      "Read the safety basics before joining an informal buddy plan.",
    ],
    relatedGuideSlugs: [
      "freediving-safety-basics",
      "best-time-to-freedive-in-the-philippines",
      "how-to-find-a-freediving-buddy",
    ],
    relatedFeatureSlugs: [
      "dive-spots",
      "buddy-finder",
      "schools-and-courses",
      "events",
    ],
    nearbyLocationSlugs: ["apo-island", "siquijor", "cebu", "panglao"],
    exploreQuery: {
      search: "Dauin",
      label: "Explore Dauin dive spots",
    },
  },
  {
    slug: "apo-island",
    name: "Apo Island",
    regionLabel: "Negros Oriental",
    href: "/freediving/apo-island",
    title: "Freediving in Apo Island",
    description:
      "Plan freediving around Apo Island with protected-area awareness, local rules, boat conditions, buddy safety, and respectful marine life practices.",
    metaTitle: "Freediving in Apo Island | Rules, Safety and Local Guidance",
    metaDescription:
      "Explore freediving around Apo Island with practical safety notes, protected-area awareness, boat planning, local guidance, and community links.",
    intro:
      "Apo Island is an iconic marine area, which means freediving plans should start with respect. Local rules, protected-area guidance, boat conditions, current, weather, and marine life behavior matter more than any checklist of spots.",
    highlights: [
      "Protected-area awareness is part of planning, not an afterthought.",
      "Boat access, current, weather, and local rules can decide whether a session is appropriate.",
      "Responsible freediving keeps distance from marine life and avoids damaging reef areas.",
    ],
    bestFor: [
      "Freedivers who value marine life and local rules",
      "Travelers planning with a local operator or guide",
      "Buddy teams that can stay conservative in changing water",
      "People using Dauin or Negros Oriental as a nearby base",
    ],
    safetyNotes: [
      "Follow marine protected area rules and local guidance every time.",
      "Check boat conditions, current, weather, and entry plans before committing.",
      "Keep respectful distance from marine life and never sacrifice safety for photos.",
    ],
    gettingStartedTips: [
      "Ask local operators or schools what is appropriate for your level.",
      "Plan backup days because boat and weather conditions can change.",
      "Use Explore and community events for context, but confirm details locally.",
      "Review safety basics and gear needs before traveling.",
    ],
    relatedGuideSlugs: [
      "freediving-safety-basics",
      "what-to-bring-to-a-freediving-session",
      "best-time-to-freedive-in-the-philippines",
    ],
    relatedFeatureSlugs: ["dive-spots", "events", "buddy-finder", "groups"],
    nearbyLocationSlugs: ["dauin", "siquijor", "panglao", "cebu"],
    exploreQuery: {
      search: "Apo Island",
      label: "Explore Apo Island dive spots",
    },
  },
  {
    slug: "panglao",
    name: "Panglao",
    regionLabel: "Bohol",
    href: "/freediving/panglao",
    title: "Freediving in Panglao",
    description:
      "Plan freediving in Panglao with local school context, community trips, island conditions, buddies, and beginner-safe guidance.",
    metaTitle: "Freediving in Panglao | Bohol Schools, Trips and Guides",
    metaDescription:
      "Explore freediving in Panglao with practical Bohol context for schools, community trips, dive spots, buddies, events, and safety guides.",
    intro:
      "Panglao and nearby Bohol waters draw freedivers for schools, trips, and island access. The useful plan is local and current: where you go, who you dive with, and what the sea is doing that day.",
    highlights: [
      "Panglao can work well for learning, community trips, and travel-based freediving plans.",
      "Schools and instructors can help beginners choose safer conditions and appropriate sessions.",
      "Nearby island or boat plans should be checked against weather, current, and operator guidance.",
    ],
    bestFor: [
      "Beginners comparing Bohol freediving schools",
      "Travelers adding freediving to a Panglao trip",
      "Community dives and small group plans",
      "Freedivers looking for nearby island access with guidance",
    ],
    safetyNotes: [
      "Ask local instructors about appropriate sites, timing, and weather windows.",
      "Stay aware of boats, current, sun exposure, and return logistics.",
      "Do not join deeper or more advanced sessions unless your training and buddy setup fit.",
    ],
    gettingStartedTips: [
      "Start with a guided session if you are new to Panglao or freediving.",
      "Check schools and courses before buying gear.",
      "Use Buddy Finder only after agreeing on goals and limits.",
      "Read the packing guide before a boat or island day.",
    ],
    relatedGuideSlugs: [
      "how-to-start-freediving-in-the-philippines",
      "what-to-bring-to-a-freediving-session",
      "freediving-certifications-philippines",
    ],
    relatedFeatureSlugs: [
      "schools-and-courses",
      "dive-spots",
      "buddy-finder",
      "events",
    ],
    nearbyLocationSlugs: ["siquijor", "cebu", "apo-island", "dauin"],
    exploreQuery: {
      search: "Panglao",
      label: "Explore Panglao dive spots",
    },
  },
  {
    slug: "moalboal",
    name: "Moalboal",
    regionLabel: "Cebu",
    href: "/freediving/moalboal",
    title: "Freediving in Moalboal",
    description:
      "Plan freediving in Moalboal with responsible marine life practices, local conditions, buddy planning, and Cebu community context.",
    metaTitle: "Freediving in Moalboal | Cebu Marine Life and Guides",
    metaDescription:
      "Explore freediving in Moalboal with practical Cebu context for marine life, local rules, buddies, dive spots, schools, and safety guides.",
    intro:
      "Moalboal is a well-known Cebu freediving destination, especially for visitors interested in marine life. That attention makes responsible behavior, local guidance, and conservative buddy planning even more important.",
    highlights: [
      "Marine life encounters should be respectful, calm, and guided by local rules.",
      "Visibility, current, crowds, and boat movement can change the feel of a session.",
      "Moalboal works best when visitors plan with local context instead of chasing photos.",
    ],
    bestFor: [
      "Travelers planning Cebu freediving days",
      "Freedivers interested in marine life with responsible practices",
      "Buddy teams that can stay patient around crowds and changing conditions",
      "People comparing Moalboal with other Cebu locations",
    ],
    safetyNotes: [
      "Respect marine life distance and never pressure animals for photos.",
      "Check current, visibility, boat traffic, and crowding before entering.",
      "Stay with a trained buddy and avoid drifting beyond your agreed area.",
    ],
    gettingStartedTips: [
      "Ask local schools, guides, or community members about current conditions.",
      "Use Explore to find community-shared Moalboal context.",
      "Read the best-time guide and keep your schedule flexible.",
      "Join groups or events if you want local context before planning a session.",
    ],
    relatedGuideSlugs: [
      "best-time-to-freedive-in-the-philippines",
      "freediving-safety-basics",
      "how-to-find-a-freediving-buddy",
    ],
    relatedFeatureSlugs: ["dive-spots", "groups", "events", "buddy-finder"],
    nearbyLocationSlugs: ["cebu", "panglao", "siquijor", "apo-island"],
    exploreQuery: {
      search: "Moalboal",
      label: "Explore Moalboal dive spots",
    },
  },
];

export const locationBySlug = new Map<string, PublicLocationContent>(
  locationPages.map((location) => [location.slug, location]),
);

export const locationRoutes = [
  "/freediving",
  ...locationPages.map((location) => location.href),
] as const;

export function getLocation(slug: string): PublicLocationContent {
  const location = locationBySlug.get(slug as PublicLocationSlug);
  if (!location) {
    throw new Error(`Missing location content for ${slug}`);
  }
  return location;
}
