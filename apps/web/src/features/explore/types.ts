export type MapViewMode = "map" | "list";

export type DiveSpot = {
  id: string;
  slug: string;
  name: string;
  area: string;
  lat?: number;
  lng?: number;
  difficulty: "easy" | "moderate" | "hard";
  verificationStatus: "community" | "instructor" | "moderator" | "verified";
  recentUpdateCount: number;
  lastConditionSummary?: string;
  isSaved: boolean;
  rating?: number;
  reviewCount?: number;
  coverImageUrl?: string;
  tags?: string[];
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
  bounds: ExploreBounds | null;
  limit: number;
  cursor?: string;
};

export type ExploreQueryState = {
  q: string;
  minRating: number | null;
  tags: string[];
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

export const EXPLORE_TAG_OPTIONS = [
  "Beginner",
  "Boat",
  "Reef",
  "Wall",
  "Wreck",
  "Macro",
  "Drift",
  "Training",
  "Deep",
  "Photography",
] as const;
