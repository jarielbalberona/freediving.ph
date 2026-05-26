import assert from "node:assert/strict";
import test from "node:test";

import type {
  ProfileDivingResponse,
  ProfilePostsResponse,
  PublicProfileResponse,
  UpdateMyProfileRequest,
} from "../src/index.ts";

test("public profile contracts expose safe public profile, posts, and diving shapes", () => {
  const profile: PublicProfileResponse = {
    profile: {
      bio: "Line diver",
      counts: { followers: 2, following: 1, posts: 3 },
      displayName: "Ana Diver",
      userId: "550e8400-e29b-41d4-a716-446655440000",
      username: "ana",
    },
  };
  const posts: ProfilePostsResponse = {
    items: [
      {
        caption: "Training day",
        commentCount: 1,
        id: "post-1",
        likeCount: 4,
        mediaType: "image",
        occurredAt: "2026-05-26T00:00:00Z",
        siteArea: "Batangas",
        siteId: "site-1",
        siteName: "Anilao",
        siteSlug: "anilao",
        thumbUrl: "https://cdn.freediving.ph/post.jpg",
      },
    ],
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
  assert.equal(posts.items[0]?.siteSlug, "anilao");
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
