export type MapViewMode = "map" | "list";

export type ExploreDifficulty = "all" | "easy" | "moderate" | "hard";

export type ExploreSortMode = "default" | "recent";

export type DiveSpot = {
  id: string;
  slug: string;
  name: string;
  area: string;
  lat?: number;
  lng?: number;
  difficulty: "easy" | "moderate" | "hard";
  depthMinM?: number;
  depthMaxM?: number;
  hazards: string[];
  verificationStatus: "community" | "instructor" | "moderator" | "verified";
  recentUpdateCount: number;
  lastConditionSummary?: string;
  isSaved: boolean;
  buddySignal?: BuddySignal;
  rating?: number;
  reviewCount?: number;
  coverImageUrl?: string;
  tags?: string[];
};

export type BuddySignal = {
  siteIntentCount: number;
  areaIntentCount: number;
  hasSiteActivity: boolean;
  hasAreaActivity: boolean;
  label: string;
};

export type ExploreResponse = {
  items: DiveSpot[];
  nextCursor?: string;
};

export type ExploreBounds = {
  ne: {
    lat: number;
    lng: number;
  };
  sw: {
    lat: number;
    lng: number;
  };
};

export type ExploreCamera = {
  center: {
    lat: number;
    lng: number;
  };
  zoom: number;
};

export type ExploreSearchParams = {
  q: string;
  area?: string;
  difficulty?: Exclude<ExploreDifficulty, "all">;
  verifiedOnly?: boolean;
  savedOnly?: boolean;
  bounds: ExploreBounds | null;
  limit: number;
  cursor?: string;
};

export type ExploreQueryState = {
  q: string;
  area: string;
  difficulty: ExploreDifficulty;
  verifiedOnly: boolean;
  savedOnly: boolean;
  view: MapViewMode;
  bounds: ExploreBounds | null;
  camera: ExploreCamera;
  selectedSpotId: string | null;
};

export const PHILIPPINES_CENTER = {
  lat: 12.8797,
  lng: 121.774,
} as const;

export const PHILIPPINES_ZOOM = 5.6;

export const EXPLORE_DEFAULT_LIMIT = 48;

export const getDiveSpotSlug = (spot: DiveSpot): string => spot.slug;
