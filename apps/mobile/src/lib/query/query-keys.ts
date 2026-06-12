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
  media: {
    all: ["media"] as const,
    postDetail: (postId: string) =>
      [...mobileQueryKeys.media.all, "posts", postId] as const,
    postCommentsRoot: (postId: string) =>
      [...mobileQueryKeys.media.all, "posts", postId, "comments"] as const,
    postComments: (postId: string, params: { limit?: number }) =>
      [...mobileQueryKeys.media.postCommentsRoot(postId), params] as const,
    profileMedia: (username: string, limit = 24) =>
      [...mobileQueryKeys.media.all, "profile", username, limit] as const,
  },
  explore: {
    all: ["explore"] as const,
    sites: () => [...mobileQueryKeys.explore.all, "sites"] as const,
    siteList: (params: {
      area?: string;
      difficulty?: string;
      limit?: number;
      savedOnly?: boolean;
      search?: string;
      sort?: string;
      verifiedOnly?: boolean;
    }) =>
      [...mobileQueryKeys.explore.all, "sites", params] as const,
    siteDetails: () =>
      [...mobileQueryKeys.explore.all, "sites", "detail"] as const,
    siteDetail: (slug: string) =>
      [...mobileQueryKeys.explore.siteDetails(), slug] as const,
    submissions: () => [...mobileQueryKeys.explore.all, "submissions"] as const,
    mySubmissions: () => [...mobileQueryKeys.explore.submissions(), "mine"] as const,
    editProposals: () =>
      [...mobileQueryKeys.explore.all, "edit-proposals"] as const,
    myEditProposals: () =>
      [...mobileQueryKeys.explore.editProposals(), "mine"] as const,
    related: (slug: string) =>
      [...mobileQueryKeys.explore.siteDetail(slug), "related"] as const,
    presence: (slug: string) =>
      [...mobileQueryKeys.explore.siteDetail(slug), "presence"] as const,
    affinities: (slug: string) =>
      [...mobileQueryKeys.explore.siteDetail(slug), "affinities"] as const,
    reviews: (slug: string) =>
      [...mobileQueryKeys.explore.siteDetail(slug), "reviews"] as const,
    communityPosts: (slug: string) =>
      [...mobileQueryKeys.explore.siteDetail(slug), "community-posts"] as const,
  },
  chika: {
    all: ["chika"] as const,
    threads: () => [...mobileQueryKeys.chika.all, "threads"] as const,
    threadList: (params: { category?: string; limit?: number }) =>
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
    list: (params: {
      beginnerFriendly?: boolean;
      difficulty?: string;
      limit?: number;
      page?: number;
      price?: string;
      search?: string;
      status?: string;
      type?: string;
    }) =>
      [...mobileQueryKeys.events.all, "list", params] as const,
    detail: (slug: string) =>
      [...mobileQueryKeys.events.all, "detail", slug] as const,
    joinFormFields: (eventId: string) =>
      [...mobileQueryKeys.events.all, "detail", eventId, "join-form-fields"] as const,
    myPass: (eventId: string) =>
      [...mobileQueryKeys.events.all, "detail", eventId, "my-pass"] as const,
    paymentMethods: (eventId: string) =>
      [...mobileQueryKeys.events.all, "detail", eventId, "payment-methods"] as const,
    participants: (eventId: string) =>
      [...mobileQueryKeys.events.all, "management", eventId, "participants"] as const,
    program: (eventId: string) =>
      [...mobileQueryKeys.events.all, "detail", eventId, "program"] as const,
    prizes: (eventId: string) =>
      [...mobileQueryKeys.events.all, "detail", eventId, "prizes"] as const,
    sponsors: (eventId: string) =>
      [...mobileQueryKeys.events.all, "detail", eventId, "sponsors"] as const,
    pass: (slug: string, token: string) =>
      [...mobileQueryKeys.events.all, "pass", slug, token] as const,
    posts: (eventId: string) =>
      [...mobileQueryKeys.events.all, "posts", eventId] as const,
  },
  schools: {
    all: ["schools"] as const,
    lists: () => [...mobileQueryKeys.schools.all, "list"] as const,
    list: (params?: { courseType?: string; location?: string; search?: string }) =>
      [...mobileQueryKeys.schools.lists(), params ?? {}] as const,
    details: () => [...mobileQueryKeys.schools.all, "detail"] as const,
    detail: (slug: string) =>
      [...mobileQueryKeys.schools.details(), slug] as const,
    courses: (
      slug: string,
      params?: {
        courseType?: string;
        level?: string;
        payment?: string;
        search?: string;
      },
    ) => [...mobileQueryKeys.schools.detail(slug), "courses", params ?? {}] as const,
    course: (slug: string, courseSlug: string) =>
      [...mobileQueryKeys.schools.detail(slug), "courses", courseSlug] as const,
    sessions: (slug: string, courseSlug: string) =>
      [...mobileQueryKeys.schools.course(slug, courseSlug), "sessions"] as const,
    myBookings: () => [...mobileQueryKeys.schools.all, "my-bookings"] as const,
    management: () => [...mobileQueryKeys.schools.all, "management"] as const,
    managedList: () => [...mobileQueryKeys.schools.management(), "list"] as const,
    managedDetail: (slug: string) =>
      [...mobileQueryKeys.schools.management(), "detail", slug] as const,
    managedCourses: (slug: string) =>
      [...mobileQueryKeys.schools.managedDetail(slug), "courses"] as const,
    managedSessions: (slug: string) =>
      [...mobileQueryKeys.schools.managedDetail(slug), "sessions"] as const,
    managedBookings: (slug: string) =>
      [...mobileQueryKeys.schools.managedDetail(slug), "bookings"] as const,
    managedMembers: (slug: string) =>
      [...mobileQueryKeys.schools.managedDetail(slug), "members"] as const,
    managedPaymentMethods: (slug: string) =>
      [...mobileQueryKeys.schools.managedDetail(slug), "payment-methods"] as const,
  },
  instructors: {
    all: ["instructors"] as const,
    me: () => [...mobileQueryKeys.instructors.all, "me"] as const,
    public: (username: string) =>
      [...mobileQueryKeys.instructors.all, "public", username] as const,
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
    relationships: () => [...mobileQueryKeys.buddies.all, "relationships"] as const,
    list: () => [...mobileQueryKeys.buddies.relationships(), "list"] as const,
    incomingRequests: () =>
      [...mobileQueryKeys.buddies.relationships(), "incoming"] as const,
    outgoingRequests: () =>
      [...mobileQueryKeys.buddies.relationships(), "outgoing"] as const,
    relationshipPreview: (userId: string) =>
      [...mobileQueryKeys.buddies.relationships(), "preview", userId] as const,
  },
  groups: {
    all: ["groups"] as const,
    lists: () => [...mobileQueryKeys.groups.all, "list"] as const,
    list: (params?: {
      limit?: number;
      mine?: boolean;
      search?: string;
      visibility?: string;
    }) =>
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
    badges: (username: string) =>
      [...mobileQueryKeys.profile.all, "public", username, "badges"] as const,
    diving: (username: string) =>
      [...mobileQueryKeys.profile.all, "public", username, "diving"] as const,
    diveMap: (username: string) =>
      [...mobileQueryKeys.profile.all, "public", username, "dive-map"] as const,
    passport: (username: string) =>
      [...mobileQueryKeys.profile.all, "public", username, "passport"] as const,
    journey: (username: string) =>
      [...mobileQueryKeys.profile.all, "public", username, "journey"] as const,
    diveMemories: (username: string) =>
      [...mobileQueryKeys.profile.all, "public", username, "dive-memories"] as const,
    diveMemoriesPages: (username: string) =>
      [...mobileQueryKeys.profile.diveMemories(username), "pages"] as const,
    diveMemoriesPage: (username: string, entrySlug: string) =>
      [...mobileQueryKeys.profile.diveMemoriesPages(username), entrySlug] as const,
    myDiveMemories: () =>
      [...mobileQueryKeys.profile.all, "me", "dive-memories"] as const,
    myDiveMemoryTags: () =>
      [...mobileQueryKeys.profile.all, "me", "dive-memory-tags"] as const,
    myPassportSettings: () =>
      [...mobileQueryKeys.profile.all, "me", "passport-settings"] as const,
    saved: () => [...mobileQueryKeys.profile.all, "saved"] as const,
  },
  safety: {
    all: ["safety"] as const,
    blocks: () => [...mobileQueryKeys.safety.all, "blocks"] as const,
    reports: () => [...mobileQueryKeys.safety.all, "reports"] as const,
  },
  moderation: {
    all: ["moderation"] as const,
    reports: (params?: { status?: string; targetType?: string }) =>
      [...mobileQueryKeys.moderation.all, "reports", params ?? {}] as const,
    report: (reportId: string) =>
      [...mobileQueryKeys.moderation.all, "reports", reportId] as const,
  },
  search: {
    all: ["search"] as const,
    people: (query: string) => [...mobileQueryKeys.search.all, "people", query] as const,
    sites: (query: string) => [...mobileQueryKeys.search.all, "sites", query] as const,
  },
};
