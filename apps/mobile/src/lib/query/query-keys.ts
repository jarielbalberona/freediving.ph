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
    siteList: (params: { limit?: number }) =>
      [...mobileQueryKeys.explore.all, "sites", params] as const,
    siteDetail: (slug: string) =>
      [...mobileQueryKeys.explore.all, "sites", "detail", slug] as const,
  },
  chika: {
    all: ["chika"] as const,
    threads: () => [...mobileQueryKeys.chika.all, "threads"] as const,
    threadList: (params: { limit?: number }) =>
      [...mobileQueryKeys.chika.all, "threads", params] as const,
    threadDetail: (slug: string) =>
      [...mobileQueryKeys.chika.all, "threads", "detail", slug] as const,
    threadComments: (threadId: string, params: { limit?: number }) =>
      [...mobileQueryKeys.chika.all, "threads", threadId, "comments", params] as const,
  },
  events: {
    all: ["events"] as const,
    lists: () => [...mobileQueryKeys.events.all, "list"] as const,
    list: (params: { limit?: number; page?: number; status?: string }) =>
      [...mobileQueryKeys.events.all, "list", params] as const,
    detail: (slug: string) =>
      [...mobileQueryKeys.events.all, "detail", slug] as const,
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
