import assert from "node:assert/strict";
import test from "node:test";
import type {
  AddDiveMemoryTagsRequest,
  CreateDiveMemoryRequest,
  DiveMemory,
  DiveMemoryResponse,
  DiveMemoryTag,
  DiveMemoryTagStatus,
  DiveMemoryVisibility,
  ProfileDiveMemoriesResponse,
  UpdateDiveMemoryTagRequest,
  UpdateDiveMemoryRequest,
} from "../src";

test("Dive Memories contracts match backend social memory shape", () => {
  const memory: DiveMemory = {
    id: "memory-1",
    authorUserId: "user-1",
    diveSiteId: "site-1",
    title: "Calm descent",
    body: "Social context only, not proof.",
    mediaIds: ["media-1"],
    visibility: "tagged",
    occurredAt: "2026-06-01T08:00:00Z",
    createdAt: "2026-06-01T08:00:00Z",
    updatedAt: "2026-06-01T08:00:00Z",
  };
  const list: ProfileDiveMemoriesResponse = { items: [memory] };
  const detail: DiveMemoryResponse = { memory };

  assert.equal(list.items[0]?.visibility, "tagged");
  assert.equal(detail.memory.diveSiteId, "site-1");
  assert.deepEqual(detail.memory.mediaIds, ["media-1"]);
  assert.equal("visitedSiteCount" in detail.memory, false);
  assert.equal("unlockedAt" in detail.memory, false);
  assert.equal("proofPostId" in detail.memory, false);
});

test("Dive Memories write contracts require a dive site but not proof fields", () => {
  const create: CreateDiveMemoryRequest = {
    diveSiteId: "site-1",
    title: "Surface interval story",
    visibility: "followers",
    mediaIds: ["media-1", "media-2"],
  };
  const update: UpdateDiveMemoryRequest = {
    diveSiteId: "site-1",
    title: "Updated surface interval story",
    body: "Still not proof.",
    visibility: "private",
  };
  const visibility: DiveMemoryVisibility = "public";

  assert.equal(create.diveSiteId, "site-1");
  assert.deepEqual(create.mediaIds, ["media-1", "media-2"]);
  assert.equal(update.visibility, "private");
  assert.equal(visibility, "public");
  assert.equal("userDiveSiteId" in create, false);
  assert.equal("badgeTemplateId" in create, false);
});

test("Dive Memory tag contracts expose pending lifecycle without public proof semantics", () => {
  const statuses: DiveMemoryTagStatus[] = [
    "pending",
    "accepted",
    "declined",
    "hidden",
  ];
  const tag: DiveMemoryTag = {
    id: "tag-1",
    memoryId: "memory-1",
    taggedUserId: "user-2",
    status: "pending",
    createdAt: "2026-06-01T08:00:00Z",
    updatedAt: "2026-06-01T08:00:00Z",
  };
  const add: AddDiveMemoryTagsRequest = { taggedUserIds: ["user-2"] };
  const accept: UpdateDiveMemoryTagRequest = { status: "accepted" };

  assert.deepEqual(statuses, ["pending", "accepted", "declined", "hidden"]);
  assert.equal(tag.status, "pending");
  assert.deepEqual(add.taggedUserIds, ["user-2"]);
  assert.equal(accept.status, "accepted");
  assert.equal("visitedSiteCount" in tag, false);
  assert.equal("unlockedDiveSiteIds" in tag, false);
});
