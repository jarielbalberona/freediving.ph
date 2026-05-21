import type {
  DiveSpotFilters,
  MintMediaUrlItemRequest,
} from "@freediving.ph/types";

type Nil = null | undefined;

export type ExploreBoundsInput = {
  north?: number | Nil;
  south?: number | Nil;
  east?: number | Nil;
  west?: number | Nil;
  ne?: { lat?: number | Nil; lng?: number | Nil } | Nil;
  sw?: { lat?: number | Nil; lng?: number | Nil } | Nil;
};

export type ExploreFilterInput = ExploreBoundsInput & {
  q?: string | Nil;
  search?: string | Nil;
  area?: string | Nil;
  difficulty?: string | Nil;
  verifiedOnly?: boolean | Nil;
  savedOnly?: boolean | Nil;
  bounds?: ExploreBoundsInput | Nil;
  cursor?: string | Nil;
  limit?: number | Nil;
};

export type NormalizedExploreBounds = {
  east: number;
  north: number;
  south: number;
  west: number;
};

export type NormalizedExploreFilters = {
  q?: string;
  area?: string;
  difficulty?: string;
  verifiedOnly?: true;
  savedOnly?: true;
  bounds?: NormalizedExploreBounds;
  cursor?: string;
  limit?: number;
};

export type DivePresenceFilterInput = {
  siteSlug?: string | Nil;
  area?: string | Nil;
  province?: string | Nil;
  presenceType?: string | Nil;
  dateFrom?: string | Nil;
  dateTo?: string | Nil;
  flexible?: boolean | Nil;
  limit?: number | Nil;
};

export type NormalizedDivePresenceFilters = {
  siteSlug?: string;
  area?: string;
  province?: string;
  presenceType?: string;
  dateFrom?: string;
  dateTo?: string;
  flexible?: boolean;
  limit?: number;
};

export type FeedParamInput = {
  source?: "home" | "activity" | "nearby-conditions" | Nil;
  mode?: string | Nil;
  filter?: string | Nil;
  cursor?: string | Nil;
  region?: string | Nil;
  lat?: number | Nil;
  lng?: number | Nil;
  limit?: number | Nil;
};

export type NormalizedFeedParams = {
  source?: "home" | "activity" | "nearby-conditions";
  mode?: string;
  filter?: string;
  cursor?: string;
  region?: string;
  lat?: number;
  lng?: number;
  limit?: number;
};

export type MediaListParamInput = {
  cursor?: string | Nil;
  limit?: number | Nil;
  contextType?: string | Nil;
  contextId?: string | Nil;
};

export type NormalizedMediaListParams = {
  cursor?: string;
  limit?: number;
  contextType?: string;
  contextId?: string;
};

export type ProfileSearchParamInput = {
  query?: string | Nil;
  limit?: number | Nil;
};

export type NormalizedProfileSearchParams = {
  query?: string;
  limit?: number;
};

const cleanString = (value?: string | Nil) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const cleanNumber = (value?: number | Nil, precision?: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return precision === undefined ? value : Number(value.toFixed(precision));
};

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${key}:${stableStringify(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
};

const normalizeQueryValue = (value: unknown): unknown => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return cleanString(value);
  if (typeof value === "number") return cleanNumber(value);
  if (typeof value === "boolean") return value;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
  }
  if (Array.isArray(value)) {
    const normalizedItems = value
      .map(normalizeQueryValue)
      .filter((item) => item !== undefined);
    if (normalizedItems.length === 0) return undefined;
    return normalizedItems.sort((left, right) =>
      stableStringify(left).localeCompare(stableStringify(right)),
    );
  }
  if (typeof value === "object") {
    const normalized = normalizeQueryObject(value as Record<string, unknown>);
    return Object.keys(normalized).length > 0 ? normalized : undefined;
  }
  return undefined;
};

export function normalizeQueryObject(
  input: Record<string, unknown> | Nil = {},
): Record<string, unknown> {
  const source = input ?? {};
  return Object.fromEntries(
    Object.entries(source)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => [key, normalizeQueryValue(value)])
      .filter(([, value]) => value !== undefined),
  );
}

const normalizeBounds = (input?: ExploreBoundsInput | Nil) => {
  const north = cleanNumber(input?.north ?? input?.ne?.lat, 6);
  const south = cleanNumber(input?.south ?? input?.sw?.lat, 6);
  const east = cleanNumber(input?.east ?? input?.ne?.lng, 6);
  const west = cleanNumber(input?.west ?? input?.sw?.lng, 6);
  if (
    north === undefined ||
    south === undefined ||
    east === undefined ||
    west === undefined
  ) {
    return undefined;
  }
  return { east, north, south, west };
};

export function normalizeExploreFilters(
  input: ExploreFilterInput = {},
): NormalizedExploreFilters {
  const bounds = normalizeBounds(input.bounds ?? input);
  return {
    q: cleanString(input.q ?? input.search),
    area: cleanString(input.area),
    difficulty:
      cleanString(input.difficulty) === "all"
        ? undefined
        : cleanString(input.difficulty),
    verifiedOnly: input.verifiedOnly ? true : undefined,
    savedOnly: input.savedOnly ? true : undefined,
    bounds,
    cursor: cleanString(input.cursor),
    limit: cleanNumber(input.limit),
  };
}

export function normalizeDiveSpotFilters(
  input: DiveSpotFilters = {},
): Record<string, unknown> {
  return normalizeQueryObject(input as Record<string, unknown>);
}

export function normalizeDivePresenceFilters(
  input: DivePresenceFilterInput = {},
): NormalizedDivePresenceFilters {
  return {
    siteSlug: cleanString(input.siteSlug),
    area: cleanString(input.area),
    province: cleanString(input.province),
    presenceType: cleanString(input.presenceType),
    dateFrom: cleanString(input.dateFrom),
    dateTo: cleanString(input.dateTo),
    flexible: typeof input.flexible === "boolean" ? input.flexible : undefined,
    limit: cleanNumber(input.limit),
  };
}

export function normalizeFeedParams(
  input: FeedParamInput = {},
): NormalizedFeedParams {
  return {
    source: input.source ?? undefined,
    mode: cleanString(input.mode),
    filter: cleanString(input.filter),
    cursor: cleanString(input.cursor),
    region: cleanString(input.region),
    lat: cleanNumber(input.lat, 4),
    lng: cleanNumber(input.lng, 4),
    limit: cleanNumber(input.limit),
  };
}

export function normalizeMediaListParams(
  input: MediaListParamInput = {},
): NormalizedMediaListParams {
  return {
    cursor: cleanString(input.cursor),
    limit: cleanNumber(input.limit),
    contextType: cleanString(input.contextType),
    contextId: cleanString(input.contextId),
  };
}

export function normalizeMintMediaUrlItems(items: MintMediaUrlItemRequest[]) {
  return [...items]
    .map(
      (item): MintMediaUrlItemRequest => ({
        mediaId: item.mediaId,
        preset: item.preset,
        width: cleanNumber(item.width),
        format: item.format,
        quality: cleanNumber(item.quality),
      }),
    )
    .sort((a, b) => {
      const keyA = `${a.mediaId}:${a.preset}:${a.width ?? ""}:${a.format ?? ""}:${a.quality ?? ""}`;
      const keyB = `${b.mediaId}:${b.preset}:${b.width ?? ""}:${b.format ?? ""}:${b.quality ?? ""}`;
      return keyA.localeCompare(keyB);
    });
}

export function normalizeProfileSearchParams(
  input: ProfileSearchParamInput = {},
): NormalizedProfileSearchParams {
  return {
    query: cleanString(input.query),
    limit: cleanNumber(input.limit),
  };
}

export const queryKeys = {
  session: {
    all: ["session"] as const,
    current: () => [...queryKeys.session.all, "current"] as const,
  },

  users: {
    all: ["users"] as const,
    lists: () => [...queryKeys.users.all, "list"] as const,
    list: (filters: Record<string, unknown> = {}) =>
      [...queryKeys.users.lists(), normalizeQueryObject(filters)] as const,
    current: () => [...queryKeys.users.all, "current"] as const,
    detail: (userId: number | string) =>
      [...queryKeys.users.all, "detail", userId] as const,
  },

  explore: {
    all: ["explore"] as const,
    lists: () => [...queryKeys.explore.all, "list"] as const,
    list: (filters: ExploreFilterInput = {}) =>
      [...queryKeys.explore.lists(), normalizeExploreFilters(filters)] as const,
    latestUpdates: (area?: string | Nil) =>
      [...queryKeys.explore.all, "latest-updates", cleanString(area)] as const,
    sites: () => [...queryKeys.explore.all, "sites"] as const,
    site: (slug: string) => [...queryKeys.explore.sites(), slug] as const,
    siteDetail: (slug: string) =>
      [...queryKeys.explore.site(slug), "detail"] as const,
    siteRelated: (slug: string) =>
      [...queryKeys.explore.site(slug), "related"] as const,
    sitePresence: (slug: string) =>
      [...queryKeys.explore.site(slug), "presence"] as const,
    siteAffinities: (slug: string) =>
      [...queryKeys.explore.site(slug), "affinities"] as const,
    siteCommunityPosts: (slug: string) =>
      [...queryKeys.explore.site(slug), "community-posts"] as const,
    siteReviews: (slug: string) =>
      [...queryKeys.explore.site(slug), "reviews"] as const,
    sitePicker: (search?: string | Nil) =>
      [...queryKeys.explore.sites(), "picker", cleanString(search)] as const,
    buddyPresenceSites: () =>
      [...queryKeys.explore.sites(), "buddy-presence-selector"] as const,
    globalPresences: (filters: DivePresenceFilterInput = {}) =>
      [
        ...queryKeys.explore.all,
        "global-presences",
        normalizeDivePresenceFilters(filters),
      ] as const,
    myDivePresences: () =>
      [...queryKeys.explore.all, "my-dive-presences"] as const,
    myDiveSiteAffinities: () =>
      [...queryKeys.explore.all, "my-dive-site-affinities"] as const,
    submissions: () => [...queryKeys.explore.all, "submissions"] as const,
    submission: (id: string) =>
      [...queryKeys.explore.submissions(), id] as const,
  },

  diveSpots: {
    all: ["dive-spots"] as const,
    list: (filters: DiveSpotFilters = {}) =>
      [
        ...queryKeys.diveSpots.all,
        "list",
        normalizeDiveSpotFilters(filters),
      ] as const,
    map: (filters: DiveSpotFilters = {}) =>
      [
        ...queryKeys.diveSpots.all,
        "map",
        normalizeDiveSpotFilters(filters),
      ] as const,
    detail: (diveSpotId: number) =>
      [...queryKeys.diveSpots.all, "detail", diveSpotId] as const,
    reviews: (diveSpotId: number) =>
      [...queryKeys.diveSpots.detail(diveSpotId), "reviews"] as const,
    reviewSummary: (diveSpotId: number) =>
      [...queryKeys.diveSpots.detail(diveSpotId), "review-summary"] as const,
  },

  media: {
    all: ["media"] as const,
    mineLists: () => [...queryKeys.media.all, "mine"] as const,
    mine: (params: MediaListParamInput = {}) =>
      [
        ...queryKeys.media.mineLists(),
        normalizeMediaListParams(params),
      ] as const,
    mintUrls: (items: MintMediaUrlItemRequest[]) =>
      [
        ...queryKeys.media.all,
        "mint-urls",
        normalizeMintMediaUrlItems(items),
      ] as const,
    profileLists: () => [...queryKeys.media.all, "profile"] as const,
    profile: (username: string, limit = 24) =>
      [...queryKeys.media.profileLists(), username, limit] as const,
    posts: () => [...queryKeys.media.all, "post"] as const,
    post: (postId: string) => [...queryKeys.media.posts(), postId] as const,
    postDetail: (postId: string) =>
      [...queryKeys.media.post(postId), "detail"] as const,
    postComments: (postId: string, limit = 20) =>
      [...queryKeys.media.post(postId), "comments", limit] as const,
  },

  profile: {
    all: ["profile"] as const,
    me: () => [...queryKeys.profile.all, "me"] as const,
    public: (username: string) =>
      [...queryKeys.profile.all, "public", username] as const,
    posts: (username: string) =>
      [...queryKeys.profile.public(username), "posts"] as const,
    bucketList: (username: string) =>
      [...queryKeys.profile.public(username), "bucketlist"] as const,
    diving: (username: string) =>
      [...queryKeys.profile.public(username), "diving"] as const,
    byUserId: (userId: string) =>
      [...queryKeys.profile.all, "user", userId] as const,
    search: (params: ProfileSearchParamInput = {}) =>
      [
        ...queryKeys.profile.all,
        "search",
        normalizeProfileSearchParams(params),
      ] as const,
    saved: () => [...queryKeys.profile.all, "saved"] as const,
  },

  feed: {
    all: ["home-feed"] as const,
    lists: () => [...queryKeys.feed.all, "list"] as const,
    list: (params: FeedParamInput = {}) =>
      [...queryKeys.feed.lists(), normalizeFeedParams(params)] as const,
    item: (id: string) => [...queryKeys.feed.all, "item", id] as const,
    activityAll: ["activity-feed"] as const,
    activityLists: () => [...queryKeys.feed.activityAll, "list"] as const,
    activityList: (params: FeedParamInput = {}) =>
      [...queryKeys.feed.activityLists(), normalizeFeedParams(params)] as const,
    nearbyConditions: (params: FeedParamInput = {}) =>
      [
        ...queryKeys.feed.all,
        "nearby-conditions",
        normalizeFeedParams({ ...params, source: "nearby-conditions" }),
      ] as const,
  },

  chika: {
    all: ["chika"] as const,
    threads: () => [...queryKeys.chika.all, "threads"] as const,
    threadList: (category?: string | Nil) =>
      [...queryKeys.chika.threads(), cleanString(category)] as const,
    thread: (threadId: string) =>
      [...queryKeys.chika.threads(), threadId] as const,
    threadComments: (threadId: string) =>
      [...queryKeys.chika.thread(threadId), "comments"] as const,
    categories: () => [...queryKeys.chika.all, "categories"] as const,
  },

  blocks: {
    all: ["blocks"] as const,
    lists: () => [...queryKeys.blocks.all, "list"] as const,
    list: () => queryKeys.blocks.lists(),
  },

  services: {
    all: ["services"] as const,
    lists: () => [...queryKeys.services.all, "list"] as const,
    list: (filters: Record<string, unknown> = {}) =>
      [...queryKeys.services.lists(), normalizeQueryObject(filters)] as const,
    detail: (serviceId: number | string) =>
      [...queryKeys.services.all, "detail", serviceId] as const,
    userServices: (userId: number | string) =>
      [...queryKeys.services.all, "user", userId] as const,
    bookings: () => [...queryKeys.services.all, "bookings"] as const,
    serviceBookings: (serviceId?: number | string) =>
      [...queryKeys.services.bookings(), "service", serviceId] as const,
    userBookings: (userId?: number | string) =>
      [...queryKeys.services.bookings(), "user", userId] as const,
    reviews: (serviceId: number | string) =>
      [...queryKeys.services.detail(serviceId), "reviews"] as const,
  },

  trainingLogs: {
    all: ["training-logs"] as const,
    lists: () => [...queryKeys.trainingLogs.all, "list"] as const,
    list: () => queryKeys.trainingLogs.lists(),
  },

  groups: {
    all: ["groups"] as const,
    lists: () => [...queryKeys.groups.all, "list"] as const,
    list: (filters: Record<string, unknown> = {}) =>
      [...queryKeys.groups.lists(), normalizeQueryObject(filters)] as const,
    detail: (groupId: string) =>
      [...queryKeys.groups.all, "detail", groupId] as const,
    members: (groupId: string, page?: number, limit?: number) =>
      [...queryKeys.groups.detail(groupId), "members", page, limit] as const,
    posts: (groupId: string, page?: number, limit?: number) =>
      [...queryKeys.groups.detail(groupId), "posts", page, limit] as const,
    userGroups: (page?: number, limit?: number) =>
      [...queryKeys.groups.all, "user", page, limit] as const,
  },

  reports: {
    all: ["reports"] as const,
    lists: () => [...queryKeys.reports.all, "list"] as const,
    list: (query: Record<string, unknown> = {}) =>
      [...queryKeys.reports.lists(), normalizeQueryObject(query)] as const,
    detail: (reportId?: string) =>
      [...queryKeys.reports.all, "detail", reportId] as const,
  },

  notifications: {
    all: ["notifications"] as const,
    lists: () => [...queryKeys.notifications.all, "list"] as const,
    list: (filters: Record<string, unknown> = {}) =>
      [
        ...queryKeys.notifications.lists(),
        normalizeQueryObject(filters),
      ] as const,
    detail: (notificationId: number | string) =>
      [...queryKeys.notifications.all, "detail", notificationId] as const,
    settings: () => [...queryKeys.notifications.all, "settings"] as const,
    stats: () => [...queryKeys.notifications.all, "stats"] as const,
  },

  buddies: {
    all: ["buddies"] as const,
    requests: () => [...queryKeys.buddies.all, "requests"] as const,
    incomingRequests: () =>
      [...queryKeys.buddies.requests(), "incoming"] as const,
    outgoingRequests: () =>
      [...queryKeys.buddies.requests(), "outgoing"] as const,
    lists: () => [...queryKeys.buddies.all, "list"] as const,
    list: () => queryKeys.buddies.lists(),
    preview: (userId?: string) =>
      [...queryKeys.buddies.all, "preview", cleanString(userId)] as const,
  },

  events: {
    all: ["events"] as const,
    lists: () => [...queryKeys.events.all, "list"] as const,
    list: (filters: Record<string, unknown> = {}) =>
      [...queryKeys.events.lists(), normalizeQueryObject(filters)] as const,
    detail: (eventId: string) =>
      [...queryKeys.events.all, "detail", eventId] as const,
    attendees: (eventId: string) =>
      [...queryKeys.events.detail(eventId), "attendees"] as const,
  },

  messages: {
    all: ["messages"] as const,
    threads: () => [...queryKeys.messages.all, "threads"] as const,
    threadList: (category: string, q: string) =>
      [
        ...queryKeys.messages.threads(),
        cleanString(category),
        cleanString(q),
      ] as const,
    thread: (threadId: string) =>
      [...queryKeys.messages.all, "thread", threadId] as const,
    threadMessages: (threadId: string) =>
      [...queryKeys.messages.thread(threadId), "messages"] as const,
    emptyThread: () => [...queryKeys.messages.all, "thread", "empty"] as const,
    emptyThreadMessages: () =>
      [...queryKeys.messages.emptyThread(), "messages"] as const,
  },

  competitiveRecords: {
    all: ["competitive-records"] as const,
    lists: () => [...queryKeys.competitiveRecords.all, "list"] as const,
    list: (filters: Record<string, unknown> = {}) =>
      [
        ...queryKeys.competitiveRecords.lists(),
        normalizeQueryObject(filters),
      ] as const,
  },

  collaboration: {
    all: ["collaboration"] as const,
    lists: () => [...queryKeys.collaboration.all, "list"] as const,
    list: () => queryKeys.collaboration.lists(),
  },

  marketplace: {
    all: ["marketplace"] as const,
    lists: () => [...queryKeys.marketplace.all, "list"] as const,
    list: () => queryKeys.marketplace.lists(),
  },

  awareness: {
    all: ["awareness"] as const,
    lists: () => [...queryKeys.awareness.all, "list"] as const,
    list: () => queryKeys.awareness.lists(),
  },

  safety: {
    all: ["safety"] as const,
    pages: () => [...queryKeys.safety.all, "pages"] as const,
    contacts: () => [...queryKeys.safety.all, "contacts"] as const,
  },

  moderation: {
    all: ["moderation"] as const,
    explore: () => [...queryKeys.moderation.all, "explore"] as const,
    pendingExploreSites: () =>
      [...queryKeys.moderation.explore(), "pending-sites"] as const,
    pendingExploreSiteEdits: () =>
      [...queryKeys.moderation.explore(), "pending-site-edits"] as const,
    exploreSite: (id: string) =>
      [...queryKeys.moderation.explore(), "site", id] as const,
    exploreSiteEdit: (id: string) =>
      [...queryKeys.moderation.explore(), "site-edit", id] as const,
  },
} as const;
