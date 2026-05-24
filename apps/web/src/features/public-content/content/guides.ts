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
    bullets?: string[];
    checklist?: string[];
    links?: Array<{
      label: string;
      href: string;
    }>;
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
    readingTime: "7 min read",
    sections: [
      {
        title: "Start with a guided session",
        body: [
          "Freediving looks simple from the shore, but the safe version starts with instruction. A good beginner session teaches breathing awareness, equalization, buddy procedures, rescue basics, and how to progress without rushing depth or time underwater.",
          "If you are comparing schools, look for clear course details, instructor background, safety expectations, location, schedule, and what gear is included. You do not need to buy a full setup before you know what fits your body and your local conditions.",
        ],
        links: [
          {
            label: "Find schools, instructors, and courses",
            href: "/features/schools-and-courses",
          },
          {
            label: "Read the certification guide",
            href: "/guides/freediving-certifications-philippines",
          },
        ],
      },
      {
        title: "Learn the safety basics early",
        body: [
          "The first rule is non-negotiable: never freedive alone. A trained buddy is part of the safety system, not just someone to take photos. You should both understand limits, signals, rest between dives, and when to stop.",
          "Avoid learning from breath-hold challenges or performance clips. Online guides can help you ask better questions, but they do not replace proper instruction in the water.",
        ],
        links: [
          {
            label: "Review freediving safety basics",
            href: "/guides/freediving-safety-basics",
          },
          {
            label: "Learn how to find a dive buddy",
            href: "/guides/how-to-find-a-freediving-buddy",
          },
        ],
      },
      {
        title: "Pick beginner-friendly water",
        body: [
          "The Philippines has beautiful freediving areas, but the right place depends on the day. Depth, access, visibility, current, boat traffic, swell, weather, and local rules all matter.",
          "Use Explore to discover dive spots, then confirm conditions with local schools, organizers, or experienced community members before entering the water.",
        ],
        links: [
          { label: "Explore dive spots", href: "/explore" },
          {
            label: "Learn about dive spot discovery",
            href: "/features/dive-spots",
          },
          {
            label: "Check seasonal planning tips",
            href: "/guides/best-time-to-freedive-in-the-philippines",
          },
        ],
      },
      {
        title: "Bring simple gear and the right mindset",
        body: [
          "For your first session, comfort matters more than owning expensive gear. A mask that seals, a snorkel, fins if available, sun protection, water, snacks, and dry clothes are usually enough if the school or organizer provides rentals.",
          "Arrive rested, hydrated, and willing to slow down. Freediving improves when you are calm, conservative, and honest about how you feel.",
        ],
        links: [
          {
            label: "See what to bring",
            href: "/guides/what-to-bring-to-a-freediving-session",
          },
        ],
      },
      {
        title: "Meet people before planning bigger dives",
        body: [
          "Groups, events, and community discussions help beginners learn local norms, find practice days, and understand which questions people are already asking.",
          "A good first goal is not depth. It is finding safe instruction, patient buddies, suitable water, and a steady way to keep learning.",
        ],
        links: [
          { label: "Find a dive buddy", href: "/features/buddy-finder" },
          { label: "Browse community events", href: "/features/events" },
          { label: "Join groups", href: "/groups" },
        ],
      },
    ],
    relatedLinks: [
      { label: "Explore dive spots", href: "/explore" },
      { label: "Find a dive buddy", href: "/features/buddy-finder" },
      { label: "Browse schools and courses", href: "/features/schools-and-courses" },
      { label: "Read safety basics", href: "/guides/freediving-safety-basics" },
    ],
  },
  {
    slug: "freediving-safety-basics",
    title: "Freediving Safety Basics",
    description:
      "Beginner-friendly freediving safety basics for diving with a trained buddy, respecting conditions, resting properly, and knowing when to stop.",
    href: "/guides/freediving-safety-basics",
    status: "published",
    publishedAt: "2026-05-24",
    updatedAt: "2026-05-24",
    readingTime: "7 min read",
    sections: [
      {
        title: "Never freedive alone",
        body: [
          "Freediving alone is not a shortcut. It is an avoidable risk. Even shallow, familiar water can become dangerous if you are tired, distracted, caught by current, or pushing a breath-hold.",
          "Dive with a trained buddy who understands freediving safety, watches you actively, and is close enough to help. A friend on the beach or boat is not the same as a buddy in position.",
        ],
        links: [
          {
            label: "Find safer buddy matches",
            href: "/guides/how-to-find-a-freediving-buddy",
          },
          { label: "Use Buddy Finder", href: "/features/buddy-finder" },
        ],
      },
      {
        title: "Agree on limits before entering the water",
        body: [
          "Talk before the session starts. Agree on the depth range, maximum dive time, rest rhythm, hand signals, entry and exit points, and what conditions would make you cancel.",
          "A safe buddy team does not pressure each other. If one person wants to stop, slow down, or stay shallow, that is the plan.",
        ],
        bullets: [
          "Set a conservative depth and time range.",
          "Take turns so one person watches while the other dives.",
          "Rest long enough between dives instead of rushing repeats.",
          "Keep the session aligned with the least experienced diver.",
        ],
      },
      {
        title: "Avoid hyperventilation and performance chasing",
        body: [
          "Do not use rapid breathing or aggressive breath-up routines to force longer dives. Hyperventilation can make warning signs less obvious and increase risk.",
          "Beginner freediving should feel calm and controlled. Focus on relaxation, equalization, clean technique, and ending dives with plenty left.",
        ],
      },
      {
        title: "Respect equalization and stop early",
        body: [
          "Equalization should be learned patiently with an instructor. If your ears, sinuses, chest, or body feel wrong, stop the dive. Do not push through pain.",
          "Stopping early is not failure. It is good judgment. Many good freedivers end sessions because conditions changed, equalization felt off, or their body was not cooperating that day.",
        ],
      },
      {
        title: "Check conditions every time",
        body: [
          "Philippine dive sites can change quickly. Current, swell, visibility, rain runoff, boat traffic, jellyfish, and local access rules can all affect whether a place is appropriate.",
          "Ask local schools, guides, boat crew, or experienced community members. If the water looks different from what you expected, pause and reassess.",
        ],
        links: [
          { label: "Explore dive spots", href: "/features/dive-spots" },
          {
            label: "Read seasonal planning tips",
            href: "/guides/best-time-to-freedive-in-the-philippines",
          },
        ],
      },
      {
        title: "Learn from qualified instructors",
        body: [
          "Online safety notes are only a starting point. A qualified instructor can correct technique, explain rescue practice, teach equalization properly, and help you understand what conservative progression looks like in real water.",
          "If you are new, book a guided intro or course before joining deeper sessions. The goal is to build habits that protect you and your buddies.",
        ],
        links: [
          {
            label: "Find schools and courses",
            href: "/features/schools-and-courses",
          },
          {
            label: "Start from the beginner guide",
            href: "/guides/how-to-start-freediving-in-the-philippines",
          },
        ],
      },
    ],
    relatedLinks: [
      { label: "Find a dive buddy", href: "/features/buddy-finder" },
      { label: "Browse schools and courses", href: "/features/schools-and-courses" },
      {
        label: "How to start freediving",
        href: "/guides/how-to-start-freediving-in-the-philippines",
      },
    ],
  },
  {
    slug: "what-to-bring-to-a-freediving-session",
    title: "What to Bring to a Freediving Session",
    description:
      "A practical freediving packing checklist for first sessions, training days, and community dives in the Philippines.",
    href: "/guides/what-to-bring-to-a-freediving-session",
    status: "published",
    publishedAt: "2026-05-24",
    updatedAt: "2026-05-24",
    readingTime: "6 min read",
    sections: [
      {
        title: "Start with the basics",
        body: [
          "You do not need to buy everything before your first freediving session. Many schools and organizers can provide rental gear, especially for intro sessions and beginner courses.",
          "What matters most is arriving prepared, comfortable, and ready to listen to the instructor or organizer.",
        ],
        checklist: [
          "Mask that seals well",
          "Snorkel",
          "Fins if you have them",
          "Wetsuit, rashguard, or swimwear suited to the water and sun",
          "Towel and change of clothes",
          "Water and light snacks",
        ],
      },
      {
        title: "Choose comfort over expensive gear",
        body: [
          "A good mask fit is more important than a famous brand. If a rental mask leaks constantly or presses painfully, tell the organizer before the session starts.",
          "Long fins can help, but they are not mandatory for every beginner activity. If you are still learning, try rental gear first so you understand what length, stiffness, and foot pocket feel right.",
        ],
      },
      {
        title: "Pack for sun, boats, and wet bags",
        body: [
          "Philippine sessions often involve strong sun, short walks, boats, tricycles, or a mix of wet and dry spaces. Small practical items make the day easier.",
        ],
        checklist: [
          "Reef-safe sunscreen",
          "Hat or cover-up for surface intervals",
          "Dry bag or waterproof pouch",
          "Reusable water bottle",
          "Small towel for the ride home",
          "Plastic-free bag for wet clothes",
        ],
      },
      {
        title: "Bring personal essentials",
        body: [
          "Bring ID, cash or a payment method, and any personal medication you may need. If you have a health concern that could affect water activity, speak with a qualified medical professional before joining.",
          "Tell your instructor or organizer about relevant needs before the session, not when you are already in the water.",
        ],
        checklist: [
          "ID",
          "Cash or payment method",
          "Personal medication if needed",
          "Emergency contact details",
          "Motion sickness support if boat rides affect you",
        ],
      },
      {
        title: "Respect the place you are visiting",
        body: [
          "Good preparation is not only about your bag. Follow local rules, listen to boat crew and guides, avoid standing on coral, keep distance from marine life, and take your trash home.",
          "If you are joining a community dive or event, arrive on time and ask what the group expects before the session starts.",
        ],
        links: [
          { label: "Browse freediving events", href: "/features/events" },
          { label: "Find schools and courses", href: "/features/schools-and-courses" },
        ],
      },
    ],
    relatedLinks: [
      { label: "Browse events", href: "/features/events" },
      { label: "Find schools and courses", href: "/features/schools-and-courses" },
      {
        label: "Read safety basics",
        href: "/guides/freediving-safety-basics",
      },
    ],
  },
  {
    slug: "how-to-find-a-freediving-buddy",
    title: "How to Find a Freediving Buddy",
    description:
      "How to find compatible freediving buddies, agree on limits, join community dives, and avoid unsafe pressure.",
    href: "/guides/how-to-find-a-freediving-buddy",
    status: "published",
    publishedAt: "2026-05-24",
    updatedAt: "2026-05-24",
    readingTime: "7 min read",
    sections: [
      {
        title: "A buddy is part of the safety system",
        body: [
          "A freediving buddy is not just someone available on the same date. A good buddy watches actively, understands basic safety, communicates clearly, and respects agreed limits.",
          "If you are new, look for people who are patient with beginner depths and comfortable saying no when conditions are not right.",
        ],
        links: [
          { label: "Use Buddy Finder", href: "/features/buddy-finder" },
          {
            label: "Review safety basics",
            href: "/guides/freediving-safety-basics",
          },
        ],
      },
      {
        title: "Check experience without making it awkward",
        body: [
          "Ask simple questions before planning a session. Where have they trained? What conditions are they comfortable with? Do they usually dive from shore or boat? Are they okay staying shallow?",
          "Certification is useful context, but behavior matters too. A careful beginner can be safer to dive with than an experienced person who ignores limits.",
        ],
        bullets: [
          "Ask about recent diving, not only lifetime experience.",
          "Share your own comfort level honestly.",
          "Agree that either person can call the session off.",
          "Avoid anyone who treats safety questions as a nuisance.",
        ],
      },
      {
        title: "Match goals before you meet",
        body: [
          "Some people want relaxed line training. Others want photos, reef swims, fitness, travel, or a community hangout. None of these are wrong, but mismatched goals can create pressure.",
          "Say what you want from the session before you enter the water. If your goal is practice and the other person wants deep dives, that is not the right match for the day.",
        ],
      },
      {
        title: "Talk about conditions first",
        body: [
          "Before entering the water, discuss weather, current, visibility, entry and exit, boats, tides, and what local guidance says. If neither person knows the site well, ask a local school, organizer, or experienced group member.",
          "Do not rely on old photos or last month's conditions. The sea does not care about your itinerary.",
        ],
        links: [
          { label: "Explore dive spots", href: "/explore" },
          {
            label: "Read seasonal planning tips",
            href: "/guides/best-time-to-freedive-in-the-philippines",
          },
        ],
      },
      {
        title: "Use groups and events to meet people safely",
        body: [
          "Community dives, classes, cleanups, and meetups are often better places to meet buddies than a cold direct message. You can observe how people communicate, handle conditions, and treat beginners.",
          "Freediving Philippines connects Buddy Finder with groups and events so you can move from online discovery to a more intentional plan.",
        ],
        links: [
          { label: "Join groups", href: "/groups" },
          { label: "Browse events", href: "/events" },
        ],
      },
      {
        title: "Avoid pressure and report unsafe behavior",
        body: [
          "Do not let a more advanced diver push you into depth, long hangs, poor visibility, bad weather, or water entry you do not want. A good buddy makes you calmer, not smaller.",
          "If someone repeatedly ignores boundaries, pressures beginners, or behaves unsafely in community spaces, use the available reporting or moderation channels.",
        ],
      },
    ],
    relatedLinks: [
      { label: "Use Buddy Finder", href: "/features/buddy-finder" },
      { label: "Join groups", href: "/groups" },
      { label: "Browse events", href: "/events" },
    ],
  },
  {
    slug: "freediving-certifications-philippines",
    title: "Freediving Certifications in the Philippines",
    description:
      "A beginner-friendly guide to freediving courses, intro sessions, certifications, and choosing instructors in the Philippines.",
    href: "/guides/freediving-certifications-philippines",
    status: "published",
    publishedAt: "2026-05-24",
    updatedAt: "2026-05-24",
    readingTime: "7 min read",
    sections: [
      {
        title: "Why a course helps",
        body: [
          "A course gives structure to skills that are hard to learn safely alone: relaxation, equalization, duck dives, finning, rescue basics, buddy procedures, and conservative decision-making.",
          "You are not only paying for a card. You are paying for feedback, supervision, and a safer introduction to the water.",
        ],
        links: [
          {
            label: "Find schools and instructors",
            href: "/features/schools-and-courses",
          },
        ],
      },
      {
        title: "Intro session or full certification",
        body: [
          "An intro session is usually a good way to try freediving, learn basic safety expectations, and see whether you enjoy the pace of the sport. It may include shallow practice, breathing awareness, and simple technique work.",
          "A full certification is more structured. It usually includes theory, confined or controlled water practice, open water sessions, equalization work, safety procedures, and performance requirements set by the teaching organization.",
        ],
      },
      {
        title: "What beginners usually learn",
        body: [
          "Beginner training should make you safer and more relaxed, not just deeper. Expect the course to spend time on how to dive with a buddy, how to rest, how to equalize, and how to stop before problems build.",
        ],
        bullets: [
          "Safety roles and buddy communication",
          "Equalization basics",
          "Relaxed breathing awareness without risky breath-hold routines",
          "Body position, duck dives, and finning",
          "Rescue awareness and supervised practice",
          "Respect for conditions and conservative limits",
        ],
      },
      {
        title: "How to choose a school or instructor",
        body: [
          "Look for clear communication, realistic expectations, good safety briefings, and a learning environment where questions are welcome. Ask what is included, what gear is available, how many students join, and what happens if conditions are not suitable.",
          "Avoid anyone who sells depth as the main promise for a beginner course. Better instruction builds judgment first.",
        ],
        checklist: [
          "Instructor credentials and recent teaching experience",
          "Clear safety procedures",
          "Reasonable student-to-instructor ratio",
          "Transparent inclusions and fees",
          "Beginner-appropriate sites and backup plans",
          "Rental gear details if you do not own equipment yet",
        ],
      },
      {
        title: "Do you need certification for every fun dive",
        body: [
          "Not every casual, shallow, supervised fun dive requires certification. Requirements depend on the organizer, location, conditions, and activity type.",
          "Training is still strongly recommended. If you plan to keep freediving, travel for dive days, join line training, or meet new buddies, a course gives you common language and safer habits.",
        ],
        links: [
          {
            label: "How to start freediving",
            href: "/guides/how-to-start-freediving-in-the-philippines",
          },
          {
            label: "What to bring to a session",
            href: "/guides/what-to-bring-to-a-freediving-session",
          },
        ],
      },
    ],
    relatedLinks: [
      { label: "Schools and courses", href: "/features/schools-and-courses" },
      {
        label: "How to start freediving",
        href: "/guides/how-to-start-freediving-in-the-philippines",
      },
      {
        label: "Freediving safety basics",
        href: "/guides/freediving-safety-basics",
      },
    ],
  },
  {
    slug: "best-time-to-freedive-in-the-philippines",
    title: "Best Time to Freedive in the Philippines",
    description:
      "Practical seasonal planning tips for freediving in the Philippines, with local conditions, visibility, weather, and community events in mind.",
    href: "/guides/best-time-to-freedive-in-the-philippines",
    status: "published",
    publishedAt: "2026-05-24",
    updatedAt: "2026-05-24",
    readingTime: "6 min read",
    sections: [
      {
        title: "There is no single best month everywhere",
        body: [
          "The Philippines is spread across many islands, coastlines, and weather patterns. A good month in one area can be windy, rainy, crowded, or low visibility somewhere else.",
          "Use seasons as a starting point, then check the actual site, local forecast, tides, wind, swell, current, and recent community reports.",
        ],
      },
      {
        title: "Dry season can be favorable in many areas",
        body: [
          "In many parts of the country, dry-season months can bring calmer weather and clearer water. That does not make every dry-season day safe or every rainy-season day bad.",
          "Local geography matters. Bays, channels, exposed coasts, island shadows, and boat traffic patterns can all change the experience.",
        ],
      },
      {
        title: "Visibility and current are local",
        body: [
          "Visibility can change after rain, wind, swell, plankton blooms, or heavy boat activity. Current can be stronger around points, channels, drop-offs, and tide changes.",
          "Ask people who have been in the water recently. A school, boat operator, local group, or event organizer will usually know more than a general travel calendar.",
        ],
        links: [
          { label: "Explore dive spots", href: "/explore" },
          {
            label: "Learn about dive spot discovery",
            href: "/features/dive-spots",
          },
        ],
      },
      {
        title: "Plan around the whole day",
        body: [
          "A good freediving day is not only about the water. Think about travel time, boat schedules, sun exposure, food, rest, and how you will get back with wet gear.",
          "If you are visiting from another island or country, give yourself buffer days. Weather delays are normal, and forcing a session into poor conditions is not worth it.",
        ],
        checklist: [
          "Check forecast, wind, swell, tide, and rain.",
          "Ask local schools or communities about current conditions.",
          "Confirm access, boat plans, and entry points.",
          "Avoid rushing after long travel or poor sleep.",
          "Have a backup activity if the sea is not suitable.",
        ],
      },
      {
        title: "Use events and community dives to plan smarter",
        body: [
          "Events, cleanups, meetups, and school sessions can help visitors understand where the community is active and what conditions people are choosing.",
          "Joining organized activities also makes it easier to meet buddies, ask local questions, and avoid guessing from old travel posts.",
        ],
        links: [
          { label: "Browse events", href: "/events" },
          { label: "Find a dive buddy", href: "/features/buddy-finder" },
        ],
      },
    ],
    relatedLinks: [
      { label: "Explore dive spots", href: "/explore" },
      { label: "Dive spot discovery", href: "/features/dive-spots" },
      { label: "Browse events", href: "/events" },
    ],
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
