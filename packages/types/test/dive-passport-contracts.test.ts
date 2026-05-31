import assert from "node:assert/strict";
import test from "node:test";
import type {
  PassportJourneyEntry,
  PassportMapMarker,
  PassportSectionState,
  ProfilePassportResponse,
  UpdatePassportSettingsRequest,
} from "../src";

test("Passport aggregate contract represents empty and unavailable sections", () => {
  const empty: PassportSectionState = { status: "empty", reason: "no_data" };
  const unavailable: PassportSectionState = {
    status: "unavailable",
    reason: "source_unavailable",
  };
  const response: ProfilePassportResponse = {
    passport: {
      profile: {
        id: "user-1",
        username: "aiko",
        createdAt: "2026-05-31T10:00:00Z",
        counts: { mediaPosts: 0, followers: 0, following: 0 },
        viewerRelationship: {
          isSelf: false,
          isFollowing: false,
          isBlocked: false,
          hasBlockedViewer: false,
          canMessage: false,
          canFollow: false,
          canEdit: false,
        },
      },
      stats: {
        visitedSiteCount: 0,
        badgeCount: 0,
        journeyEntryCount: 0,
        mediaPostCount: 0,
        memoryCount: 0,
      },
      mapPreview: { state: empty, visitedSiteCount: 0, markers: [] },
      badgeShowcase: { state: empty, badges: [], autoStats: [] },
      journeyHighlights: { state: empty, entries: [] },
      recentMedia: { state: empty, items: [] },
      memories: unavailable,
      settings: {
        showMap: true,
        showBadges: true,
        showJourney: true,
        showMemories: true,
        featuredBadgeIds: [],
      },
    },
  };

  assert.equal(response.passport.mapPreview.state.status, "empty");
  assert.equal(response.passport.memories.status, "unavailable");
  assert.equal(response.passport.stats.visitedSiteCount, 0);
  assert.equal(response.passport.stats.badgeCount, 0);
  assert.equal(response.passport.stats.journeyEntryCount, 0);
  assert.equal(response.passport.stats.memoryCount, 0);
  assert.equal(response.passport.mapPreview.markers.length, 0);
  assert.equal(response.passport.badgeShowcase.badges.length, 0);
  assert.equal(response.passport.journeyHighlights.entries.length, 0);
  assert.equal(response.passport.recentMedia.items.length, 0);
});

test("Passport settings contract is presentation-only", () => {
  const request: UpdatePassportSettingsRequest = {
    showMap: true,
    showBadges: false,
    showJourney: true,
    showMemories: false,
    featuredBadgeIds: ["badge-1"],
  };

  assert.equal(request.showBadges, false);
  assert.deepEqual(request.featuredBadgeIds, ["badge-1"]);
  assert.equal("badgeVisibility" in request, false);
  assert.equal("visitedSiteCount" in request, false);
  assert.equal("journeyEntryCount" in request, false);
  assert.equal("unlockedDiveSiteIds" in request, false);
  assert.equal("verifiedCredentials" in request, false);
});

test("Passport aggregate uses compact read-only child previews", () => {
  const marker: PassportMapMarker = {
    diveSiteId: "site-1",
    diveSiteSlug: "site-one",
    diveSiteName: "Site One",
    diveSiteArea: "Batangas",
    firstVisitedAt: "2026-05-01T08:00:00Z",
    lastVisitedAt: "2026-05-20T08:00:00Z",
    mediaPostCount: 2,
  };
  const journey: PassportJourneyEntry = {
    id: "journey-1",
    type: "map_milestone",
    title: "Visited Site One",
    visibility: "public",
    occurredAt: "2026-05-20T08:00:00Z",
  };

  assert.equal("firstPostId" in marker, false);
  assert.equal("lastPostId" in marker, false);
  assert.equal("unlockedAt" in marker, false);
  assert.equal("sourceType" in journey, false);
  assert.equal("sourceId" in journey, false);
  assert.equal("mediaIds" in journey, false);
  assert.equal("state" in journey, false);
});
