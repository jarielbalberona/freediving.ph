import assert from "node:assert/strict";
import test from "node:test";

import type {
  MediaContextType,
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

test("media contracts expose minting and context enums", () => {
  assert.equal(true, true);
});
