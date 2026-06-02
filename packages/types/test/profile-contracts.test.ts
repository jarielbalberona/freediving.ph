import assert from "node:assert/strict";
import test from "node:test";

import type {
  ProfileDiveMemoriesPageResponse,
  ProfileDiveMapResponse,
  ProfileDiveMapSiteResponse,
  ProfileDivingResponse,
  ProfileViewResponse,
  UpdateMyProfileRequest,
} from "../src/index.ts";

test("profile view contracts expose safe profile and diving shapes", () => {
  const profile: ProfileViewResponse = {
    profile: {
      createdAt: "2026-05-26T00:00:00Z",
      bio: "Line diver",
      counts: { followers: 2, following: 1, mediaPosts: 3 },
      displayName: "Ana Diver",
      id: "550e8400-e29b-41d4-a716-446655440000",
      username: "ana",
      viewerRelationship: {
        canEdit: false,
        canFollow: false,
        canMessage: false,
        hasBlockedViewer: false,
        isBlocked: false,
        isFollowing: false,
        isSelf: false,
      },
    },
  };
  const diving: ProfileDivingResponse = {
    affinities: [],
    presences: [
      {
        contactEnabled: true,
        createdAt: "2026-05-26T00:00:00Z",
        diveSiteId: "site-1",
        diveSiteName: "Anilao",
        diveSiteSlug: "anilao",
        id: "presence-1",
        presenceType: "training",
        viewerCanContact: false,
        visibility: "public",
      },
    ],
  };

  assert.equal(profile.profile.username, "ana");
  assert.equal(diving.presences[0]?.visibility, "public");
});

test("profile edit request stays limited to user-editable fields", () => {
  const update: UpdateMyProfileRequest = {
    bio: "Freediver",
    displayName: "Ana Diver",
  };

  assert.equal(update.displayName, "Ana Diver");
  assert.equal(update.bio, "Freediver");
});

test("profile dive map contracts expose proof-based marker and media shapes", () => {
  const map: ProfileDiveMapResponse = {
    visitedSiteCount: 1,
    markers: [
      {
        diveSiteId: "66666666-6666-4666-8666-666666666666",
        diveSiteSlug: "anilao",
        diveSiteName: "Anilao",
        diveSiteArea: "Batangas",
        firstPostId: "11111111-1111-4111-8111-111111111111",
        firstVisitedAt: "2026-05-31T00:00:00Z",
        lastPostId: "11111111-1111-4111-8111-111111111111",
        lastVisitedAt: "2026-05-31T00:00:00Z",
        mediaPostCount: 1,
        visibility: "members",
        unlockedAt: "2026-05-31T00:00:00Z",
        lastProofAddedAt: "2026-05-31T00:00:00Z",
      },
    ],
  };
  const detail: ProfileDiveMapSiteResponse = {
    marker: map.markers[0],
    media: [
      {
        postId: "11111111-1111-4111-8111-111111111111",
        mediaItemId: "22222222-2222-4222-8222-222222222222",
        mediaObjectId: "33333333-3333-4333-8333-333333333333",
        type: "photo",
        url: "profile-feed/anilao.jpg",
        mimeType: "image/jpeg",
        width: 1200,
        height: 900,
        createdAt: "2026-05-31T00:00:00Z",
      },
    ],
    memories: [
      {
        id: "memory-1",
        authorUserId: "user-1",
        diveSiteId: "66666666-6666-4666-8666-666666666666",
        title: "Current and calm",
        mediaIds: [],
        visibility: "public",
        occurredAt: "2026-05-31T00:00:00Z",
        createdAt: "2026-05-31T00:00:00Z",
        updatedAt: "2026-05-31T00:00:00Z",
      },
    ],
  };

  assert.equal(map.visitedSiteCount, 1);
  assert.equal(detail.media[0]?.type, "photo");
  assert.equal(detail.memories[0]?.title, "Current and calm");
  assert.equal("visitedSiteCount" in detail.memories[0], false);
});

test("profile dive memories page contracts distinguish proof from memory items", () => {
  const page: ProfileDiveMemoriesPageResponse = {
    profile: {
      id: "550e8400-e29b-41d4-a716-446655440000",
      username: "ana",
      displayName: "Ana Diver",
      viewerIsOwner: false,
    },
    site: {
      diveSiteId: "66666666-6666-4666-8666-666666666666",
      slug: "anilao",
      name: "Anilao",
      area: "Batangas",
    },
    entry: {
      firstProofAt: "2026-05-31T00:00:00Z",
      lastProofAt: "2026-05-31T00:00:00Z",
      lastUpdatedAt: "2026-05-31T00:00:00Z",
      proofCount: 1,
      memoryCount: 1,
      mediaCount: 2,
      textCount: 0,
      viewerCanCreateMemory: false,
      viewerCanManageMemories: false,
    },
    proofItems: [
      {
        id: "proof-item-1",
        kind: "proof_media_post",
        postId: "11111111-1111-4111-8111-111111111111",
        mediaItemId: "22222222-2222-4222-8222-222222222222",
        mediaObjectId: "33333333-3333-4333-8333-333333333333",
        media: {
          id: "33333333-3333-4333-8333-333333333333",
          url: "https://cdn.example.com/proof.jpg",
          mimeType: "image/jpeg",
          width: 1200,
          height: 900,
          type: "photo",
        },
        createdAt: "2026-05-31T00:00:00Z",
        proofLabel: "Proof post",
      },
    ],
    memoryItems: [
      {
        id: "memory-1",
        kind: "dive_memory",
        author: {
          userId: "550e8400-e29b-41d4-a716-446655440000",
          username: "ana",
        },
        title: "Current and calm",
        visibility: "public",
        occurredAt: "2026-05-31T00:00:00Z",
        createdAt: "2026-05-31T00:00:00Z",
        updatedAt: "2026-05-31T00:00:00Z",
        attachments: [
          {
            id: "attachment-1",
            mediaObjectId: "44444444-4444-4444-8444-444444444444",
            media: {
              id: "44444444-4444-4444-8444-444444444444",
              url: "https://cdn.example.com/memory.jpg",
              mimeType: "image/jpeg",
              width: 1080,
              height: 1080,
              type: "photo",
            },
            createdAt: "2026-05-31T00:00:00Z",
          },
        ],
        viewerCanEdit: false,
        viewerCanDelete: false,
      },
    ],
    limits: {
      proofItems: 120,
      memoryItems: 20,
    },
  };

  assert.equal(page.proofItems[0]?.kind, "proof_media_post");
  assert.equal(page.memoryItems[0]?.kind, "dive_memory");
  assert.equal(page.memoryItems[0]?.attachments[0]?.media.type, "photo");
});
