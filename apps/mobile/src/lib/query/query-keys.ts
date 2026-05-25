export const mobileQueryKeys = {
  health: {
    all: ["health"] as const,
    fphgo: () => [...mobileQueryKeys.health.all, "fphgo"] as const,
  },
  session: {
    all: ["session"] as const,
    current: () => [...mobileQueryKeys.session.all, "current"] as const,
  },
  feed: {
    all: ["feed"] as const,
    home: () => [...mobileQueryKeys.feed.all, "home"] as const,
    activity: (params: { filter?: string; limit?: number }) =>
      [...mobileQueryKeys.feed.all, "activity", params] as const,
  },
  explore: {
    all: ["explore"] as const,
    sites: () => [...mobileQueryKeys.explore.all, "sites"] as const,
  },
  chika: {
    all: ["chika"] as const,
    threads: () => [...mobileQueryKeys.chika.all, "threads"] as const,
  },
  events: {
    all: ["events"] as const,
    lists: () => [...mobileQueryKeys.events.all, "list"] as const,
  },
  buddies: {
    all: ["buddies"] as const,
    intents: () => [...mobileQueryKeys.buddies.all, "intents"] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    list: () => [...mobileQueryKeys.notifications.all, "list"] as const,
  },
  profile: {
    all: ["profile"] as const,
    me: () => [...mobileQueryKeys.profile.all, "me"] as const,
  },
};
