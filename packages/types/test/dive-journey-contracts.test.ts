import assert from "node:assert/strict";
import test from "node:test";
import type {
  CreateManualJourneyEntryRequest,
  HideJourneyEntryRequest,
  JourneyEntry,
  JourneyEntryVisibility,
  ProfileJourneyResponse,
  UpdateManualJourneyEntryRequest,
} from "../src";

test("Journey contracts expose manual and generated entry shapes", () => {
  const manual: JourneyEntry = {
    id: "entry-1",
    userId: "user-1",
    type: "custom",
    title: "First calm line dive",
    mediaIds: [],
    visibility: "followers",
    state: "active",
    occurredAt: "2026-05-31T10:00:00Z",
    createdAt: "2026-05-31T10:00:00Z",
    updatedAt: "2026-05-31T10:00:00Z",
  };
  const generated: JourneyEntry = {
    ...manual,
    id: "entry-2",
    type: "map_milestone",
    sourceType: "dive_map",
    sourceId: "user-site-1",
    visibility: "public",
  };
  const response: ProfileJourneyResponse = { items: [manual, generated] };

  assert.equal(response.items[0]?.type, "custom");
  assert.equal(response.items[1]?.sourceType, "dive_map");
  assert.equal(response.items[1]?.sourceId, "user-site-1");
});

test("Journey write contracts allow no dive site or media", () => {
  const create: CreateManualJourneyEntryRequest = {
    title: "Saw a turtle",
    body: "No photo, just a memory.",
    visibility: "private",
  };
  const update: UpdateManualJourneyEntryRequest = {
    title: "Saw a turtle again",
    mediaIds: ["media-1"],
  };
  const visibility: JourneyEntryVisibility = "followers";

  assert.equal(create.diveSiteId, undefined);
  assert.equal(create.mediaIds, undefined);
  assert.deepEqual(update.mediaIds, ["media-1"]);
  assert.equal(visibility, "followers");
});

test("Journey visibility and hide contracts expose locked states only", () => {
  const visibilities: JourneyEntryVisibility[] = ["public", "followers", "private"];
  const hidden: JourneyEntry = {
    id: "entry-hidden",
    userId: "user-1",
    type: "badge",
    title: "Hidden badge story",
    sourceType: "badge",
    sourceId: "badge:depth-10",
    mediaIds: [],
    visibility: "private",
    state: "hidden",
    occurredAt: "2026-05-31T10:00:00Z",
    createdAt: "2026-05-31T10:00:00Z",
    updatedAt: "2026-05-31T10:00:00Z",
  };
  const hideRequest: HideJourneyEntryRequest = { hidden: true };

  assert.deepEqual(visibilities, ["public", "followers", "private"]);
  assert.equal(hidden.state, "hidden");
  assert.equal(hideRequest.hidden, true);
});
