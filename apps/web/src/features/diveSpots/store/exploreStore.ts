import { create } from "zustand";

type ExploreViewMode = "map" | "list";
type ExploreDifficulty = "ALL" | "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
type ExploreSort = "newest" | "oldest" | "name";

export type ExploreBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type ExploreMapState = {
  bounds: ExploreBounds;
  center: {
    lat: number;
    lng: number;
  };
  zoom: number;
};

export type ExploreFiltersState = {
  search: string;
  location: string;
  difficulty: ExploreDifficulty;
  sort: ExploreSort;
};

type ExploreStoreState = {
  viewMode: ExploreViewMode;
  filters: ExploreFiltersState;
  map: ExploreMapState;
  selectedSpotId: number | null;
  setViewMode: (viewMode: ExploreViewMode) => void;
  setFilters: (filters: Partial<ExploreFiltersState>) => void;
  setMapState: (map: Partial<ExploreMapState> & { bounds?: Partial<ExploreBounds> }) => void;
  setSelectedSpotId: (spotId: number | null) => void;
  initialize: (state: {
    viewMode?: ExploreViewMode;
    filters?: Partial<ExploreFiltersState>;
    map?: {
      bounds?: Partial<ExploreBounds>;
      center?: { lat: number; lng: number };
      zoom?: number;
    };
    selectedSpotId?: number | null;
  }) => void;
};

export const DEFAULT_EXPLORE_BOUNDS: ExploreBounds = {
  north: 19,
  south: 4.5,
  east: 127,
  west: 116,
};

const DEFAULT_EXPLORE_CENTER = { lat: 11.8, lng: 121.4 };

export const useExploreStore = create<ExploreStoreState>((set) => ({
  viewMode: "map",
  filters: {
    search: "",
    location: "",
    difficulty: "ALL",
    sort: "newest",
  },
  map: {
    bounds: DEFAULT_EXPLORE_BOUNDS,
    center: DEFAULT_EXPLORE_CENTER,
    zoom: 6.4,
  },
  selectedSpotId: null,
  setViewMode: (viewMode) => set({ viewMode }),
  setFilters: (filters) =>
    set((state) => ({
      filters: {
        ...state.filters,
        ...filters,
      },
    })),
  setMapState: (map) =>
    set((state) => ({
      map: {
        ...state.map,
        ...map,
        bounds: {
          ...state.map.bounds,
          ...(map.bounds ?? {}),
        },
      },
    })),
  setSelectedSpotId: (selectedSpotId) => set({ selectedSpotId }),
  initialize: (payload) =>
    set((state) => ({
      viewMode: payload.viewMode ?? state.viewMode,
      filters: {
        ...state.filters,
        ...(payload.filters ?? {}),
      },
      map: {
        ...state.map,
        ...(payload.map ?? {}),
        bounds: {
          ...state.map.bounds,
          ...(payload.map?.bounds ?? {}),
        },
      },
      selectedSpotId: payload.selectedSpotId ?? state.selectedSpotId,
    })),
}));
