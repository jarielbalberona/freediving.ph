import assert from "node:assert/strict";
import test from "node:test";

import type {
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
