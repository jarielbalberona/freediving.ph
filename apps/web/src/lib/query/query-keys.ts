import type { DiveSpotFilters, MintMediaUrlItemRequest } from "@freediving.ph/types";

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
  return Object.fromEntries(
    Object.entries(input)
      .map(([key, value]) => [
        key,
        typeof value === "string" ? cleanString(value) : value,
      ])
      .filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
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

  explore: {
    all: ["explore"] as const,
    lists: () => [...queryKeys.explore.all, "list"] as const,
    list: (filters: ExploreFilterInput = {}) =>
      [...queryKeys.explore.lists(), normalizeExploreFilters(filters)] as const,
    latestUpdates: (area?: string | Nil) =>
      [...queryKeys.explore.all, "latest-updates", cleanString(area) ?? ""] as const,
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
      [...queryKeys.explore.sites(), "picker", cleanString(search) ?? ""] as const,
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
      [...queryKeys.diveSpots.all, "list", normalizeDiveSpotFilters(filters)] as const,
    map: (filters: DiveSpotFilters = {}) =>
      [...queryKeys.diveSpots.all, "map", normalizeDiveSpotFilters(filters)] as const,
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
      [...queryKeys.media.mineLists(), normalizeMediaListParams(params)] as const,
    mintUrls: (items: MintMediaUrlItemRequest[]) =>
      [...queryKeys.media.all, "mint-urls", normalizeMintMediaUrlItems(items)] as const,
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
    byUserId: (userId: string) => [...queryKeys.profile.all, "user", userId] as const,
    search: (params: ProfileSearchParamInput = {}) =>
      [...queryKeys.profile.all, "search", normalizeProfileSearchParams(params)] as const,
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
} as const;
