import assert from "node:assert/strict";
import test from "node:test";

import type {
  CreateMediaPostRequest,
  ListProfileMediaResponse,
  MediaContextType,
  MediaItemType,
  MediaPreset,
  MintMediaUrlItem,
  MintMediaUrlsResponse,
} from "../src/index.ts";

type Assert<T extends true> = T;
type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

type _contextType = Assert<
  IsEqual<
    MediaContextType,
    | "profile_avatar"
    | "profile_feed"
    | "chika_attachment"
    | "event_attachment"
    | "dive_spot_attachment"
    | "group_cover"
  >
>;
type _preset = Assert<IsEqual<MediaPreset, "thumb" | "card" | "dialog" | "original">>;
type _mintItem = Assert<IsEqual<MintMediaUrlsResponse["items"][number], MintMediaUrlItem>>;
type _postItemType = Assert<IsEqual<MediaItemType, "photo" | "video">>;
type _createMediaItems = Assert<IsEqual<CreateMediaPostRequest["items"][number]["type"], MediaItemType>>;
type _profileMediaList = Assert<IsEqual<ListProfileMediaResponse["items"][number]["type"], MediaItemType>>;

test("media contracts expose upload, publish, and gallery enums", () => {
  assert.equal(true, true);
});
