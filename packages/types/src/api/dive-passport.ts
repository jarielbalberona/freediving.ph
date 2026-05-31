import type { JourneyEntryType, JourneyEntryVisibility } from "./dive-journey";
import type { ProfileView } from "./profile-view";
import type { UserBadge } from "./badges";

export type PassportSectionStatus =
  | "ready"
  | "empty"
  | "unavailable"
  | "hidden";

export type PassportSectionReason =
  | "new_profile"
  | "no_data"
  | "source_unavailable"
  | "viewer_not_allowed"
  | "settings_hidden";

export interface PassportSectionState {
  status: PassportSectionStatus;
  reason?: PassportSectionReason;
}

export interface PassportStats {
  visitedSiteCount: number;
  badgeCount: number;
  journeyEntryCount: number;
  mediaPostCount: number;
  memoryCount: number;
}

export interface PassportMapMarker {
  diveSiteId: string;
  diveSiteSlug: string;
  diveSiteName: string;
  diveSiteArea: string;
  firstVisitedAt: string;
  lastVisitedAt: string;
  mediaPostCount: number;
}

export interface PassportMapPreview {
  state: PassportSectionState;
  visitedSiteCount: number;
  markers: PassportMapMarker[];
}

export interface PassportBadgeShowcase {
  state: PassportSectionState;
  badges: UserBadge[];
  autoStats: UserBadge[];
}

export interface PassportJourneyHighlights {
  state: PassportSectionState;
  entries: PassportJourneyEntry[];
}

export interface PassportJourneyEntry {
  id: string;
  type: JourneyEntryType | string;
  title: string;
  body?: string;
  visibility: JourneyEntryVisibility | string;
  occurredAt: string;
}

export interface PassportMediaItem {
  id: string;
  url: string;
  type: "photo" | "video" | string;
  createdAt: string;
}

export interface PassportRecentMedia {
  state: PassportSectionState;
  items: PassportMediaItem[];
}

export interface PassportSettings {
  showMap: boolean;
  showBadges: boolean;
  showJourney: boolean;
  showMemories: boolean;
  featuredBadgeIds: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProfilePassport {
  profile: ProfileView;
  stats: PassportStats;
  mapPreview: PassportMapPreview;
  badgeShowcase: PassportBadgeShowcase;
  journeyHighlights: PassportJourneyHighlights;
  recentMedia: PassportRecentMedia;
  memories: PassportSectionState;
  settings: PassportSettings;
}

export interface ProfilePassportResponse {
  passport: ProfilePassport;
}

export interface PassportSettingsResponse {
  settings: PassportSettings;
}

export interface UpdatePassportSettingsRequest {
  showMap: boolean;
  showBadges: boolean;
  showJourney: boolean;
  showMemories: boolean;
  featuredBadgeIds?: string[];
}
