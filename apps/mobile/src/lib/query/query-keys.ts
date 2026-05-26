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
    siteDetails: () =>
      [...mobileQueryKeys.explore.all, "sites", "detail"] as const,
    siteDetail: (slug: string) =>
      [...mobileQueryKeys.explore.siteDetails(), slug] as const,
    submissions: () => [...mobileQueryKeys.explore.all, "submissions"] as const,
    mySubmissions: () => [...mobileQueryKeys.explore.submissions(), "mine"] as const,
  },
  chika: {
    all: ["chika"] as const,
    threads: () => [...mobileQueryKeys.chika.all, "threads"] as const,
    threadList: (params: { limit?: number }) =>
      [...mobileQueryKeys.chika.all, "threads", params] as const,
    threadDetails: () =>
      [...mobileQueryKeys.chika.all, "threads", "detail"] as const,
    threadDetail: (slug: string) =>
      [...mobileQueryKeys.chika.threadDetails(), slug] as const,
    threadCommentsRoot: (threadId: string) =>
      [...mobileQueryKeys.chika.all, "threads", threadId, "comments"] as const,
    threadComments: (threadId: string, params: { limit?: number }) =>
      [...mobileQueryKeys.chika.threadCommentsRoot(threadId), params] as const,
    categories: () => [...mobileQueryKeys.chika.all, "categories"] as const,
  },
  events: {
    all: ["events"] as const,
    lists: () => [...mobileQueryKeys.events.all, "list"] as const,
    list: (params: { limit?: number; page?: number; status?: string }) =>
      [...mobileQueryKeys.events.all, "list", params] as const,
    detail: (slug: string) =>
      [...mobileQueryKeys.events.all, "detail", slug] as const,
    posts: (eventId: string) =>
      [...mobileQueryKeys.events.all, "posts", eventId] as const,
  },
  buddies: {
    all: ["buddies"] as const,
    previews: () => [...mobileQueryKeys.buddies.all, "preview"] as const,
    preview: (params?: { limit?: number }) =>
      [...mobileQueryKeys.buddies.previews(), params ?? {}] as const,
    intentLists: () => [...mobileQueryKeys.buddies.all, "intents"] as const,
    intents: (params?: { limit?: number }) =>
      [...mobileQueryKeys.buddies.intentLists(), params ?? {}] as const,
    mine: () => [...mobileQueryKeys.buddies.all, "mine"] as const,
  },
  groups: {
    all: ["groups"] as const,
    lists: () => [...mobileQueryKeys.groups.all, "list"] as const,
    list: (params?: { limit?: number; mine?: boolean }) =>
      [...mobileQueryKeys.groups.lists(), params ?? {}] as const,
    details: () => [...mobileQueryKeys.groups.all, "detail"] as const,
    detail: (slug: string) =>
      [...mobileQueryKeys.groups.details(), slug] as const,
    members: (groupId: string) =>
      [...mobileQueryKeys.groups.all, "detail", groupId, "members"] as const,
    posts: (groupId: string) =>
      [...mobileQueryKeys.groups.all, "detail", groupId, "posts"] as const,
  },
  messages: {
    all: ["messages"] as const,
    threadLists: () =>
      [...mobileQueryKeys.messages.all, "threads", "list"] as const,
    threads: (category: string) =>
      [...mobileQueryKeys.messages.threadLists(), category] as const,
    threadDetails: () =>
      [...mobileQueryKeys.messages.all, "threads", "detail"] as const,
    detail: (threadId: string) =>
      [...mobileQueryKeys.messages.threadDetails(), threadId] as const,
    messages: (threadId: string) =>
      [...mobileQueryKeys.messages.detail(threadId), "messages"] as const,
    unreadCount: () => [...mobileQueryKeys.messages.all, "unread-count"] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    list: (params?: { limit?: number; offset?: number }) =>
      [...mobileQueryKeys.notifications.all, "list", params ?? {}] as const,
    settings: () =>
      [...mobileQueryKeys.notifications.all, "settings"] as const,
    unreadCount: () =>
      [...mobileQueryKeys.notifications.all, "unread-count"] as const,
  },
  profile: {
    all: ["profile"] as const,
    me: () => [...mobileQueryKeys.profile.all, "me"] as const,
    public: (username: string) =>
      [...mobileQueryKeys.profile.all, "public", username] as const,
    posts: (username: string) =>
      [...mobileQueryKeys.profile.all, "public", username, "posts"] as const,
    diving: (username: string) =>
      [...mobileQueryKeys.profile.all, "public", username, "diving"] as const,
  },
};
