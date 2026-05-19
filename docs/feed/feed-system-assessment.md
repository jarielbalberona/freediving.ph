# Feed System Assessment

Date: 2026-05-19

## Executive Verdict

The current Freediving Philippines feed is real enough to render live backend data, but it is not yet a real cross-module activity feed in the Facebook/Instagram sense. It is a homepage mixer: `GET /v1/feed/home` queries several source tables, scores candidates in Go, returns card-specific payloads, and the web renders those cards.

That is materially better than a static mock. It is also not good enough as the long-term feed foundation. The biggest technical blocker is that feed identity, pagination, filtering, and privacy are derived at read time from scattered source tables. There is no normalized activity item contract or durable activity ledger. The current cursor is an encoded offset over an in-memory scored merge, which is not stable under live write churn and will get worse as modules grow.

Recommendation: move to **Option C: Hybrid**. Add an `activity_items` table and publisher/adapters for major modules now, while keeping query-time source adapters only as a temporary bridge for modules that are not ready. Do not build ML ranking, fanout, push notification infrastructure, or recommendation systems.

## Phase 1 Implementation Notes

Implemented on 2026-05-19.

What was fixed:
- `/v1/feed/home` remains the live route, but the public/member boundary is tighter.
- Guest feed responses no longer include member-only buddy intents.
- Event candidates now require `status = 'published'` and enforce event visibility:
  - guests only get public published events
  - signed-in viewers get public events plus group-member/invite-only events only when membership rules authorize them
- Chika feed items now mask real actor id, username, author href, and display name for `pseudonymous` and `locked_pseudonymous` threads. The payload uses the thread pseudonym, or `You` for the author viewing their own pseudonymous thread.
- Actor-backed source queries now suppress inactive users consistently for dive-site updates, media posts, Chika threads, buddy intents, and events with organizers.
- Feed tabs were made honest:
  - `Latest`
  - `Nearby`
  - `Chika`
  - `Dive reports`
  - `Events`
- Legacy mode query aliases are accepted for route compatibility:
  - `following` maps to `latest`
  - `spot-reports` maps to `dive-reports`
  - `training` maps to `latest`
- Server-side filters are now strict for `Chika`, `Dive reports`, and `Events`.
- `Nearby` now requires the viewer home area or an explicit `region` filter to match item areas. It no longer behaves as a soft mixed-feed boost.
- `hide_item` actions now write `user_hidden_feed_items`. `not_interested` remains feedback/ranking telemetry only.
- The migration/schema mode checks now include the new honest mode values while preserving legacy values for existing telemetry rows.

Known limitations still deferred:
- The feed is still a query-time homepage mixer, not the planned normalized `activity_items` feed.
- Cursor pagination is still offset-based over the merged result.
- Media cards still mint display URLs separately from the feed payload.
- There is still no true following graph behind the feed.
- `Nearby` is string-area based. It is not yet PSGC/geospatial matching.
- `Dive reports` still includes approved dive-site briefing cards alongside actual condition updates because there is no normalized activity ledger yet.

## Current Implementation Map

### Web Route And Page

- `apps/web/src/app/page.tsx`
  - Homepage is a thin entrypoint that renders `HomeFeedPage`.
- `apps/web/src/features/home-feed/components/HomeFeedPage.tsx`
  - Client component. Owns selected mode, cursor, accumulated items, fallback context/actions/conditions, error text, and `MixedFeed`.
- `apps/web/src/features/home-feed/components/FeedModeTabs.tsx`
  - Tabs: `Latest`, `Nearby`, `Chika`, `Dive reports`, `Events`.
  - Backing mode values: `latest`, `nearby`, `chika`, `dive-reports`, `events`.
- `apps/web/src/features/home-feed/components/MixedFeed.tsx`
  - Empty/loading states, session id, infinite scroll, impression tracking, action logging.
- `apps/web/src/features/home-feed/components/FeedItemRenderer.tsx`
  - Switches on `item.type`.
  - Supported render types: `post`, `media_post`, `community_hot_post`, `dive_spot`, `event`, `buddy_signal`, `record_highlight`.
- `apps/web/src/features/home-feed/components/FeedCardShell.tsx`
  - Common card frame, labels, relative time, primary detail link, save/not-interested action area.
- Card components:
  - `apps/web/src/features/home-feed/components/cards/PostFeedCard.tsx`
  - `apps/web/src/features/home-feed/components/cards/MediaPostCard.tsx`
  - `apps/web/src/features/home-feed/components/cards/CommunityHotCard.tsx`
  - `apps/web/src/features/home-feed/components/cards/DiveSpotCard.tsx`
  - `apps/web/src/features/home-feed/components/cards/EventCard.tsx`
  - `apps/web/src/features/home-feed/components/cards/BuddySignalCard.tsx`
  - `apps/web/src/features/home-feed/components/cards/RecordHighlightCard.tsx`
- `apps/web/src/features/home-feed/components/HomeQuickActions.tsx`
  - Handles quick CTAs such as `Post update`, `Find buddy`, `Start chika`, `Create session`.
  - Maps `post_update` to profile post creation when a username exists.
  - Hides `log_dive` and `log_training`.
- `apps/web/src/features/home-feed/components/NearbyConditionsCard.tsx`
  - Renders a fixed-shape condition summary from feed response.

### Web API And Hooks

- `apps/web/src/features/home-feed/api/get-home-feed.ts`
  - Calls `/v1/feed/home` with `mode`, `cursor`, optional `region`, and `limit`.
- `apps/web/src/features/home-feed/api/post-feed-impressions.ts`
  - Calls `/v1/feed/impressions`.
- `apps/web/src/features/home-feed/api/post-feed-actions.ts`
  - Calls `/v1/feed/actions`.
- `apps/web/src/features/home-feed/hooks/queries/useHomeFeedQuery.ts`
  - React Query key is `["home-feed", mode, cursor]`.
  - Always requests `limit: 20`.
- `apps/web/src/features/home-feed/hooks/useFeedImpressionTracker.ts`
  - Uses `IntersectionObserver`.
  - Posts impressions when cards cross threshold.
- `apps/web/src/features/home-feed/hooks/mutations/useFeedActionMutation.ts`
  - Sends card actions.
- `apps/web/src/lib/api/fphgo-routes.ts`
  - Feed route constants:
    - `/v1/feed/home`
    - `/v1/feed/impressions`
    - `/v1/feed/actions`
- `packages/types/src/feed.ts`
  - Shared TypeScript feed response and telemetry contracts.

### Backend Feed Code

- `services/fphgo/internal/app/routes.go`
  - Mounts feed router at `/v1/feed`.
  - Auth middleware is attached optionally at the API group level; protected routes use `RequireMember`.
- `services/fphgo/internal/app/app.go`
  - Wires `feedrepo.New(pool)`, `feedservice.New(feedRepo)`, and `feedhttp.New(feedService, v)`.
- `services/fphgo/internal/features/feed/http/routes.go`
  - `GET /home`
  - `POST /impressions` behind `RequireMember`
  - `POST /actions` behind `RequireMember`
- `services/fphgo/internal/features/feed/http/handlers.go`
  - Parses mode, limit, cursor, region.
  - `GET /home` permits guest access.
  - Telemetry requires authenticated member.
- `services/fphgo/internal/features/feed/http/dto.go`
  - HTTP response/request DTOs.
- `services/fphgo/internal/features/feed/service/service.go`
  - Pulls candidates from repo.
  - Scores candidates.
  - Applies mode multipliers.
  - Suppresses hidden items.
  - Encodes/decodes offset cursor as base64 `o:<offset>`.
- `services/fphgo/internal/features/feed/service/scorer.go`
  - Freshness and area boosts.
- `services/fphgo/internal/features/feed/service/merger.go`
  - Diversity merge, type mix targets, score normalization, cursor slice.
- `services/fphgo/internal/features/feed/service/strategy.go`
  - Presentation labels, mode context, quick actions, detail href builders.
- `services/fphgo/internal/features/feed/repo/repo.go`
  - Hand-written SQL queries against source tables and telemetry tables.

## Current Data Flow

1. `apps/web/src/app/page.tsx` renders `HomeFeedPage`.
2. `HomeFeedPage` starts in `mode = "latest"` and calls `useHomeFeedQuery`.
3. `getHomeFeed` calls `GET /v1/feed/home?mode=<mode>&limit=20`.
4. Go handler parses query params and calls `feedservice.Home`.
5. Service loads:
   - viewer home area from `profiles`
   - hidden feed items from `user_hidden_feed_items`
   - negative action counts from `feed_actions`
   - source candidates from dive site updates, media posts, Chika threads, dive sites, buddy intents, and events
6. Service scores and merges everything in Go memory.
7. Web renders type-specific cards.
8. Web separately emits impressions/actions.
9. Media feed cards separately mint media URLs through the media API.

## Current API State

### `GET /v1/feed/home`

Auth:
- Optional. Guests can call it.
- If authenticated, `CurrentIdentity` supplies `userID`.

Query:
- `mode=latest|nearby|chika|dive-reports|events`
- Legacy aliases accepted for compatibility: `following`, `training`, `spot-reports`.
- `cursor=<opaque>`
- `region=<string>` accepted and used as the `nearby` area filter when present.
- `limit=<number>`, default 20, max 50, guest max 10.

Response:
- `context`
- `quickActions`
- `nearbyCondition`
- `items`
- `nextCursor`

Pagination:
- Cursor is not keyset.
- Cursor is base64 encoded offset, decoded by `decodeCursor`.
- Guests are forced to offset 0 and do not get meaningful pagination.

Ordering:
- Each candidate query orders by source recency.
- Service sorts by computed score, then `createdAt`, then id.
- This is ranked ordering, not latest-first activity ordering.

Filters:
- `latest` remains a mixed eligible feed.
- `latest` returns the current eligible mixed feed.
- `nearby` requires the viewer home area or explicit `region` to match item areas.
- `chika`, `dive-reports`, and `events` are strict server-side filters.
- `chika` only returns Chika thread items.
- `dive-reports` only returns dive-site update/report-like items and site briefing cards.
- `events` only returns eligible event items.

N+1 risk:
- Feed response is mostly hydrated for text cards.
- Media cards call `useMintedMediaMap` per card to mint image URLs. That is an obvious per-card request pattern.
- Feed payload does not include actor avatars as a normalized field.

### `POST /v1/feed/impressions`

Auth:
- Member-only via `RequireMember`.

Request:
- `sessionId`
- `mode`
- `items[]` with `feedItemId`, `entityType`, `entityId`, `position`, optional `seenAt`

Storage:
- `feed_impressions`.
- Deduped by `(user_id, session_id, feed_item_id, position)`.

### `POST /v1/feed/actions`

Auth:
- Member-only via `RequireMember`.

Request:
- `sessionId`
- `mode`
- `items[]` with optional `feedItemId`, `entityType`, `entityId`, `actionType`, optional `valueJson`, optional `createdAt`

Storage:
- `feed_actions`.
- `hide_item` also writes `user_hidden_feed_items`, so that item is suppressed from future eligible feed responses for the member.
- `not_interested` remains feedback/ranking telemetry only. It does not hide the item.

## Current DB State

Feed-specific tables:
- `feed_impressions`
- `feed_actions`
- `user_feed_preferences`
- `user_hidden_feed_items`
- `activity_items` (Phase 2 foundation; new ledger used by `/v1/feed/activity`)

`/v1/feed/home` still uses synthesized feed identity strings such as `fi_post_<id>`, `fi_media_<id>`, `fi_community_<id>`, `fi_spot_<id>`, `fi_event_<id>`, and `fi_buddy_<id>`. Phase 2 adds `activity_items` as a durable ledger and exposes it through `/v1/feed/activity`; it does not replace the deployed homepage mixer yet.

Relevant source tables:
- `users`
- `profiles`
- `user_blocks`
- `buddy_relationships`, `buddy_requests`, `buddies`
- `chika_categories`, `chika_threads`, `chika_posts`, `chika_comments`, reactions, aliases
- `dive_sites`, `dive_site_updates`, `dive_site_saves`
- `buddy_intents`
- `groups`, `group_memberships`, `group_posts`
- `events`, `event_memberships`
- `media_posts`, `media_items`, `media_objects`, `media_upload_groups`
- `reports`, `moderation_actions`

Important indexes already present:
- `idx_chika_threads_visible_created_at`
- `idx_dive_site_updates_site_occurred_at`
- `idx_dive_site_updates_author_created_at`
- `idx_dive_sites_updated_id`
- `idx_buddy_intents_area_created_at`
- `idx_buddy_intents_author_created_at`
- `idx_buddy_intents_expires_at`
- `idx_events_visibility_status_starts`
- `idx_media_posts_author_created_at`
- `idx_media_items_status_created_at`
- feed telemetry and hidden item indexes

Missing for the next feed architecture:
- `activity_items(visibility, occurred_at, id)` or equivalent keyset index.
- Per-source uniqueness such as `(source_module, source_type, source_id)`.
- Viewer eligibility indexes if private/group-member visibility is encoded in activity rows.
- Partial indexes for public, active, not-deleted activity.

## What Is Still Fake, Static, Or Limited

- There is still no true following feed because no feed-owned follow graph is queried.
- Training remains out of the feed tabs until a real training activity source exists.
- `Nearby` is still string-area matching, not PSGC/geospatial filtering.
- `Dive reports` is now strict by type, but it still includes dive-site briefing cards because the current model does not have a normalized activity ledger.
- `NearbyConditionsCard` uses hardcoded fallback values such as wind, safety, and sunrise in repo fallback paths.
- `record_highlight` exists in TypeScript and web rendering, but backend `ItemType` does not define or emit it.
- `user_feed_preferences` exists but is not used in candidate generation.
- The old feed docs describe "infinite cursor pagination" and a completed baseline. Current implementation uses offset pagination over a ranked in-memory merge, so that claim is too optimistic.

## What Is Real

- The homepage is API-driven, not static.
- `GET /v1/feed/home` is wired in `services/fphgo`.
- Candidate data is pulled from real tables:
  - `dive_site_updates`
  - `media_posts` / `media_items`
  - `chika_threads`
  - `dive_sites`
  - `buddy_intents`
  - `events`
- Basic block suppression exists in most source candidate queries.
- Basic moderation suppression exists for some sources:
  - Chika threads exclude `deleted_at` and `hidden_at`.
  - Dive-site updates require `state = 'active'`.
  - Dive sites require `moderation_state = 'approved'`.
  - Media posts/items exclude deleted/hidden items.
- Feed action and impression telemetry is real and stored.
- Web card rendering is real and connected to the backend response.

## Source Module Assessment

| Module | Current feed source | Useful feed items now | Visibility/privacy fields | Current safety status |
| --- | --- | --- | --- | --- |
| Profiles / follows | `profiles`, `users`; no follow table found | Actor metadata and home area only | `profiles.pseudonymous_enabled`, `users.account_status`; no profile privacy field found | Not enough for a true following feed |
| User photos/media/posts | `media_posts`, `media_items`, `media_objects` | Photo posts with captions and dive site context | `media_items.status`, `media_items.deleted_at`, `media_posts.deleted_at`, `media_objects.state` | Good candidate source, but feed response needs bundled display URLs or batch URL hydration |
| Chika threads | `chika_threads`, `chika_categories`, reactions/comments | Thread creation/trending card | `mode`, `hidden_at`, `deleted_at`, category `pseudonymous` | Phase 1 masks pseudonymous feed actor fields; replies still need the same treatment when added |
| Chika replies/comments | `chika_posts`, `chika_comments` | Reply activity could be useful | `deleted_at`, `hidden_at`, pseudonyms | Not currently emitted; must preserve pseudonymous actor behavior |
| Buddy intents | `buddy_intents` | Active buddy call cards | `visibility = 'members'`, `state`, `expires_at` | Phase 1 excludes member-only buddy intents from guest feed responses |
| Buddy requests | `buddy_requests`, `buddies` | Relationship activity only if explicitly public/follower-scoped | `status` | Should not appear in public/community feed by default |
| Dive sites | `dive_sites`, `dive_site_saves` | Spot briefing, saved/bucket-list related activity | `moderation_state`, verification fields | Public approved sites are safe |
| Condition reports | `dive_site_updates` | Strong feed source | `state`, site moderation | Good source, but location should stay at dive-site/area level, not precise personal location |
| Groups | `groups`, `group_posts`, `group_memberships` | Group creation/posts/activity | `groups.visibility`, `groups.status`, `group_posts.status`, `deleted_at`, membership | Not currently included except events; needs member-aware filtering |
| Events | `events`, `event_memberships` | Published events, joined events | `status`, `visibility`, `group_id`, membership | Phase 1 filters to published events and enforces public/group/invite visibility for feed candidates |
| Competitive records | Docs mention competitive records, but no feed source found in current backend scan | Potential later milestone cards | Unknown | Defer until schema/source is real |
| Messaging | `conversations`, `messages`, message threads | No public feed use | private thread membership | Do not feed this except maybe private notification surfaces, not community feed |

## Privacy And Safety Risks

### Rules Already Present

- `user_blocks` exists.
- Chika list/detail paths enforce deleted/hidden filtering and block filtering in their own repo logic.
- Chika supports pseudonymous and locked pseudonymous modes plus per-thread aliases.
- `reports` and `moderation_actions` exist.
- Dive sites have `moderation_state`.
- Dive site updates have `state`.
- Media objects/items have state/status/deleted fields.
- Groups have `visibility` and `status`.
- Events have `visibility` and `status`.
- Messaging has private member tables and pending/accepted state.

### Fixed In Phase 1

- Buddy intents have `visibility = 'members'`, and guest feed requests now exclude them.
- Event candidates now require `events.status = 'published'` and enforce public/group-member/invite-only visibility rules.
- Chika feed cards no longer expose `authorUserId`, `authorName`, `authorUsername`, or profile href for pseudonymous or locked-pseudonymous threads.
- Community, buddy intent, dive-site update, media, and organizer-backed event queries now suppress non-active users.
- `hide_item` telemetry now also writes `user_hidden_feed_items`.

### Still Missing Or Deferred

- Group visibility is not enforced because group posts are not currently feed sources; it must be enforced before adding them.
- `user_feed_preferences` is unused.
- No clear coarse-location policy exists for feed payloads beyond area/dive-site fields.
- No feed-level contract says which source modules are guest-safe versus member-only.

Minimum required before launch of the rewritten feed:
- Server-side visibility policy per source type.
- Chika pseudonymous actor mapping in any new source adapter, including replies.
- Event status/visibility filtering for any new event-derived feed types, including attendance activity.
- Buddy-intent public-safe preview policy if the product ever wants guest-visible buddy cards.
- User account status suppression in every future source adapter.
- Deleted/hidden/moderated checks in every source adapter.
- Block suppression in every actor-based source.
- Group membership checks for private/invite-only groups and group-member events.

## Performance Risks

Current bottlenecks:
- Six independent source queries per feed request, then scoring and sorting in Go memory.
- Offset cursor over a ranked merge. This is unstable as new rows arrive and gets increasingly wasteful.
- No durable normalized item id. IDs are synthesized from source rows, so pagination and deduplication stay ad hoc.
- Per-card media URL minting from the web creates N+1 request behavior for media-heavy feeds.
- Source queries use correlated subqueries for counts and saved/viewer flags. Fine for small data, risky under growth.
- `ListDiveSpotCandidates` counts saves and recent updates per row.
- `ListCommunityCandidates` counts replies and reactions per row.
- `GetNearbyCondition` has hardcoded fallback values and a simple saved-site heuristic.
- Hidden suppression is checked both in repo queries and service-level hidden maps, duplicating logic.
- Region parameter is unused, so future callers may think they are narrowing data when they are not.

Likely first production bottleneck:
- Feed home p95 latency will degrade from candidate fan-in plus correlated counts, especially when Chika, media, and dive-site updates grow. The first user-visible pain will be homepage load time and unstable pagination, not ML-quality ranking.

Safe MVP optimization path:
- Move to keyset pagination around `occurred_at,id`.
- Normalize feed items into `activity_items`.
- Keep one table read as the primary feed path.
- Hydrate actors and targets in bounded joins.
- Batch media URL hydration or include signed/public display URLs in the feed response according to media security rules.
- Add partial indexes on active/public activity.
- Keep ranking rule-based and simple.

## Architecture Options

### Option A: Query-Time Union Feed

Pros:
- Lowest write-path complexity.
- Easy to add while modules are immature.
- Current system is already close to this, although implemented as several queries plus Go merge rather than one SQL union.

Cons:
- Privacy logic repeats across source queries.
- Pagination is hard if ranking crosses modules.
- Source-specific counts and joins become expensive.
- Difficult to produce a stable activity contract.
- "Following" and filters become hand-wavy unless each query grows specialized logic.

Verdict:
- Acceptable as a short bridge. Bad as the next foundation.

### Option B: `activity_items` Table

Pros:
- One feed identity model.
- Clean keyset pagination.
- Central visibility and source metadata.
- Extensible across modules.
- Easier to test and reason about.

Cons:
- Requires publisher/write-path integration.
- Requires backfill for existing data.
- Must handle source deletion/moderation updates.

Verdict:
- Correct target shape, but doing it all at once is unnecessary risk.

### Option C: Hybrid

Pros:
- Adds the right foundation without blocking every module on day one.
- Major modules can publish normalized activity now.
- Query-time adapters can temporarily cover incomplete modules.
- Allows migration without breaking the deployed homepage.

Cons:
- Temporary dual path can get messy if not time-boxed.
- Requires strict ownership and exit criteria.

Recommendation:
- Use **Option C**. For this app, the source modules are already diverse enough that pure query-time feed will become a maintenance trap, but the product is still MVP enough that a full fanout/ranking system would be waste. Build an `activity_items` ledger for real activities, keep simple source adapters only as fallback, and remove the fallback once publishers cover the MVP sources.

## Proposed Feed Item Contract

The current `payload: Record<string, unknown>` contract lets web and API drift. Replace it with a normalized envelope plus typed `content` per item type.

```ts
type FeedVisibility =
  | "public"
  | "members"
  | "followers"
  | "group_members"
  | "private";

type FeedSourceModule =
  | "profiles"
  | "media"
  | "chika"
  | "buddy_finder"
  | "explore"
  | "groups"
  | "events";

type FeedItemType =
  | "media_post_created"
  | "chika_thread_created"
  | "chika_reply_added"
  | "buddy_intent_created"
  | "dive_site_update_added"
  | "dive_site_saved"
  | "group_created"
  | "group_post_created"
  | "event_published"
  | "event_joined";

type FeedActor = {
  id: string;
  name: string;
  username?: string | null;
  avatarUrl?: string | null;
  pseudonymous?: boolean;
  pseudonym?: string | null;
};

type FeedMedia = {
  mediaId: string;
  url?: string;
  width?: number;
  height?: number;
  alt?: string;
};

type FeedTarget = {
  type: "profile" | "chika_thread" | "dive_site" | "buddy_intent" | "group" | "event";
  id: string;
  label: string;
  href: string;
};

type FeedLocation = {
  area?: string;
  diveSiteId?: string;
  diveSiteSlug?: string;
  diveSiteName?: string;
  regionCode?: string;
  provinceCode?: string;
  cityCode?: string;
};

type FeedStats = {
  comments?: number;
  replies?: number;
  reactions?: number;
  likes?: number;
  saves?: number;
  attendees?: number;
};

type FeedItem = {
  id: string;
  type: FeedItemType;
  sourceModule: FeedSourceModule;
  sourceId: string;
  sourceCreatedAt?: string;
  actor?: FeedActor;
  occurredAt: string;
  visibility: FeedVisibility;
  title?: string;
  body?: string;
  media?: FeedMedia[];
  target: FeedTarget;
  location?: FeedLocation;
  stats?: FeedStats;
  href: string;
  viewerState?: {
    hidden?: boolean;
    saved?: boolean;
    joined?: boolean;
    followingActor?: boolean;
  };
};

type FeedResponse = {
  items: FeedItem[];
  nextCursor?: string;
};
```

For the existing homepage shell, keep optional separate blocks if desired:

```ts
type HomeFeedResponse = {
  context: HomeFeedContext;
  quickActions: HomeFeedQuickAction[];
  nearbyCondition?: HomeFeedNearbyCondition;
  items: FeedItem[];
  nextCursor?: string;
};
```

Do not keep score/rank labels in the public MVP contract unless they are intentionally visible product copy. If ranking reasons are needed, put them behind debug/admin flags.

## Proposed DB / Model Changes

Add a normalized activity ledger:

```sql
CREATE TABLE activity_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  source_module TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id UUID NOT NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  visibility TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'active',
  area TEXT,
  dive_site_id UUID REFERENCES dive_sites(id) ON DELETE SET NULL,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  occurred_at TIMESTAMPTZ NOT NULL,
  source_created_at TIMESTAMPTZ,
  title TEXT,
  body TEXT,
  media JSONB NOT NULL DEFAULT '[]'::jsonb,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_module, source_type, source_id, type),
  CHECK (state IN ('active', 'hidden', 'deleted')),
  CHECK (visibility IN ('public', 'members', 'followers', 'group_members', 'private'))
);

CREATE INDEX idx_activity_items_public_cursor
  ON activity_items (occurred_at DESC, id DESC)
  WHERE state = 'active' AND visibility = 'public';

CREATE INDEX idx_activity_items_visibility_cursor
  ON activity_items (visibility, occurred_at DESC, id DESC)
  WHERE state = 'active';

CREATE INDEX idx_activity_items_actor_cursor
  ON activity_items (actor_user_id, occurred_at DESC, id DESC)
  WHERE state = 'active' AND actor_user_id IS NOT NULL;

CREATE INDEX idx_activity_items_group_cursor
  ON activity_items (group_id, occurred_at DESC, id DESC)
  WHERE state = 'active' AND group_id IS NOT NULL;

CREATE INDEX idx_activity_items_dive_site_cursor
  ON activity_items (dive_site_id, occurred_at DESC, id DESC)
  WHERE state = 'active' AND dive_site_id IS NOT NULL;
```

Keep `feed_impressions`, `feed_actions`, `user_hidden_feed_items`, and `user_feed_preferences`, but wire them to real behavior:
- `not_interested` lowers rank.
- `hide_item` writes `user_hidden_feed_items`.
- Preferences affect filters/ranking.

## Feed Filters

Current tabs after Phase 1:
- `Latest`: eligible mixed feed.
- `Nearby`: area-matched activity only.
- `Chika`: Chika thread activity only.
- `Dive reports`: dive-site update/report-like activity only.
- `Events`: eligible events only.

MVP filters to keep only if backend can truthfully power them:
- `Latest`: all eligible public/member-safe activity ordered by `occurred_at`.
- `Following`: only after a real follow graph or buddy/following equivalent is defined. Until then, do not call it Following or For you.
- `Nearby`: only after source rows have usable area/PSGC/dive-site location and the API applies a real location predicate.
- `Chika`: activity types from Chika threads/replies, preserving pseudonymous behavior.
- `Dive reports`: dive-site updates and condition reports.
- `Events`: published public/member-eligible events.

Immediate UI state:
- `For you` and `Training` have been removed from the feed tab set.
- `Conditions` has been renamed to `Dive reports`.
- Strict server-side mode filters now back the visible tabs.

## Phased Implementation Plan

### Phase 1: Current-State Fixes

- Stop calling the default tab `For you` unless it is backed by a real graph. **Done in Phase 1.**
- Make empty states honest: "No recent community activity" beats implying followed/training content exists. **Done in Phase 1.**
- Either remove `region` from the client contract or implement it server-side. **Implemented for `nearby` in Phase 1.**
- Fix launch-blocking privacy gaps in the current endpoint before widening feed usage. **Done in Phase 1 for the known feed sources:**
  - no guest exposure of member-only buddy intents
  - event status/visibility checks
  - pseudonymous Chika actor protection
  - `users.account_status = 'active'` checks for all actor sources
- Keep deployed app stability: do not remove the current `/v1/feed/home` route yet.

### Phase 2: Backend Feed Foundation

- Add `activity_items` migration.
- Add per-feature sqlc queries or repo functions for activity read/write.
- Add feed service methods:
  - list latest
  - list nearby
  - list by module/type
  - list following once graph exists
- Implement keyset cursor as `{occurredAt,id}` encoded opaquely.
- Centralize visibility filtering:
  - public
  - members
  - group members
  - followers when graph exists
  - private excluded
- Enforce blocks, account status, deletion, hidden/moderated state server-side.
- Return typed feed items; avoid `payload: Record<string, unknown>` for new contract.

### Phase 3: Module Publishers Or Source Adapters

- Media:
  - publish `media_post_created` when a media post is created.
  - include media ids and dimensions.
- Chika:
  - publish `chika_thread_created` and optionally `chika_reply_added`.
  - use pseudonymous actor fields for pseudonymous categories/threads.
- Buddy Finder:
  - publish `buddy_intent_created`.
  - visibility must stay member-only unless a safe public preview is explicitly designed.
- Explore:
  - publish `dive_site_update_added`.
  - optionally publish `dive_site_saved` only if product decides that save/bucket-list activity is public/follower-safe.
- Groups:
  - publish `group_created` for public groups.
  - publish `group_post_created` for group members or public groups only.
- Events:
  - publish `event_published`.
  - publish `event_joined` only if public attendance activity is a deliberate product choice.
- Records:
  - defer until there is a real backend record model.

### Phase 4: Web Feed Rendering

- Replace card-specific unknown payloads with typed item renderers.
- Add strict switch exhaustiveness for feed item types.
- Batch media URL hydration or have feed return display URLs where permitted.
- Add honest skeletons, empty states, and error states per filter.
- Use `Load more` first if infinite scroll masks failures; infinite scroll can remain if stable.
- Keep mobile-first card density. This is an operational community app, not a marketing page.

### Phase 5: Verification

- Backend unit tests:
  - cursor encode/decode and keyset ordering
  - visibility matrix
  - block suppression
  - pseudonymous Chika actor mapping
  - member-only buddy intent exclusion for guests
  - event visibility/status filtering
- Backend integration/query tests:
  - activity read path with mixed module rows
  - group-member visibility
  - hidden/deleted/moderated source suppression
- API contract tests:
  - `GET /v1/feed/home`
  - `GET /v1/feed/activity?filter=<filter>`
  - telemetry payload validation
- Web tests:
  - route constant contract
  - feed item renderer type coverage
  - empty/error states
  - media batching behavior
- Manual smoke:
  - guest latest feed
  - signed-in latest feed
  - no-follow/no-activity user
  - member-only buddy post not visible to guest
  - pseudonymous Chika does not show real author
  - private/group event not visible to non-member
  - deleted/hidden Chika and media do not appear

## Verification Plan

Assessment commands run in this pass:
- `rg -n "freediving|feed|fphgo" /Users/jariel/.codex/memories/MEMORY.md`
- `pwd && rg --files -g 'AGENTS.md' -g 'package.json' -g 'go.mod' -g 'sqlc*.yaml' -g '*.sql'`
- `git status --short`
- `sed -n '1,220p' AGENTS.md`
- `sed -n '1,220p' apps/web/AGENTS.md`
- `sed -n '1,260p' services/fphgo/AGENTS.md`
- `rg -n "feed|For you|For You|Near me|Training|Conditions|Post update|Find buddy|Start chika|Create session|activity" apps/web packages/types services/fphgo`
- targeted `sed` reads for the web feed files, feed service, feed repo, schema, migrations, and module repos.
- `pnpm --filter @freediving.ph/types test`
- `pnpm --filter @freediving.ph/web type-check`
- `cd services/fphgo && go test ./internal/features/feed/...`

Additional checks to run during implementation:
- `cd services/fphgo && go test ./internal/features/feed/... ./internal/features/chika/... ./internal/features/buddyfinder/... ./internal/features/events/... ./internal/features/groups/...`
- `pnpm --filter @freediving.ph/web test`
- `pnpm --filter @freediving.ph/types test`
- `pnpm --filter @freediving.ph/web type-check`
- `pnpm --filter @freediving.ph/web lint`

Do not run device/emulator checks for this feed work unless scope changes.

## Phase 1 Closure Verification

Date: 2026-05-19

Verdict: **Phase 1 closure PASS WITH ISSUES: ready to start Phase 2 only after listed issues are accepted or scheduled.**

### Repo And Commit State

- Branch: `main`.
- Initial closure checkout state: clean.
- Recent commits:
  - `6944262 update pages`
  - `ad9e855 update feed and pages`
- `ad9e855 update feed and pages` is present in history and contains the feed hardening work plus unrelated page/community changes:
  - feed API/service/repo
  - feed mode migration/schema
  - shared feed types/tests
  - home feed tabs/cards/empty states
  - unrelated `apps/web/src/app/buddies/page.tsx`, `events/page.tsx`, `groups/page.tsx`, and community page/nav work
- Closure pass changed this document only, to remove stale statements about `user_hidden_feed_items` and strict filters.

### Documentation Consistency

- `hide_item` is documented as writing `user_hidden_feed_items`.
- `not_interested` is documented as telemetry/ranking feedback only.
- `feed_actions` remains the telemetry store for feed actions.
- Hidden items are documented as suppressed from future eligible responses.
- Visible modes are documented as:
  - `latest`
  - `nearby`
  - `chika`
  - `dive-reports`
  - `events`
- Legacy aliases are documented as compatibility-only:
  - `following -> latest`
  - `training -> latest`
  - `spot-reports -> dive-reports`

### Migration Verification

- Inspected `services/fphgo/db/migrations/0033_feed_phase1_modes.sql`.
- Inspected `services/fphgo/db/schema/000_schema.sql`.
- Migration only drops/re-adds check constraints on `feed_impressions.mode` and `feed_actions.mode`.
- No table reset, truncate, delete, rewrite, or data backfill.
- Existing telemetry rows using legacy modes remain valid.
- New mode values are allowed: `latest`, `nearby`, `chika`, `dive-reports`, `events`.
- Legacy values remain allowed: `following`, `training`, `spot-reports`.
- `goose -dir db/migrations validate` passed locally.
- Target environment application was not DB-table verified directly because no production DB access was used. The Render blueprint uses `preDeployCommand: cd services/fphgo && make migrate-up`; live canonical API behavior confirms the feed code is deployed, but the telemetry check constraint state was not independently queried.

### Commands Run

- `git status --short` - clean at start of closure pass; this document is dirty after closure-note updates.
- `git branch --show-current` - `main`.
- `git log --oneline -8` - confirmed `6944262` and `ad9e855`.
- `go run github.com/pressly/goose/v3/cmd/goose@v3.24.1 -dir db/migrations validate` - passed.
- `cd services/fphgo && go test ./internal/features/feed/...` - passed.
- `pnpm --filter @freediving.ph/types test` - passed.
- `pnpm --filter @freediving.ph/web type-check` - passed.
- `pnpm --filter @freediving.ph/web test` - failed with two known non-feed contract failures:
  - `apps/web/test/explore-buddy-site-contract.test.mjs` expects `Area fallback`.
  - `apps/web/test/media-profile-flow-contract.test.mjs` expects `Apply to all`.

### Deployed API Smoke

Canonical live URLs used:
- Web: `https://freediving.ph/`
- API: `https://api.freediving.ph/`

Guest API smoke:
- `GET /v1/feed/home?mode=latest&limit=10` - `200`, returned `community_hot_post`, `dive_spot`.
- `GET /v1/feed/home?mode=chika&limit=10` - `200`, returned only `community_hot_post`.
- `GET /v1/feed/home?mode=dive-reports&limit=10` - `200`, returned only `dive_spot` briefing/report-like cards.
- `GET /v1/feed/home?mode=events&limit=10` - `200`, returned no items in current live seed data.
- `GET /v1/feed/home?mode=nearby&region=Mabini&limit=10` - `200`, returned only area-matched `dive_spot`.
- No guest `buddy_signal` appeared in sampled responses.
- No private/invite/group-only event appeared in sampled responses.
- No pseudonymous Chika item existed in sampled live responses, so live pseudonymous masking was not data-proven; code tests cover it.
- Canonical CORS smoke with `Origin: https://freediving.ph` returned `access-control-allow-origin: https://freediving.ph`.

Signed-in API smoke:
- Blocked. No `MEMBER_TOKEN` was available in the shell, and no test account token was provided.
- `hide_item` production smoke was not run because it requires a known test/member token and a safe test item.

### Deployed Web Smoke

- `https://freediving.ph/` loaded.
- Default page showed `Latest activity`.
- Visible tabs: `Latest`, `Nearby`, `Chika`, `Dive reports`, `Events`.
- `For you` was not present.
- `Training` was not present.
- `Chika` tab showed only the Chika thread card in current live data.
- `Events` tab showed the honest empty state: "No eligible events yet".
- `Dive reports` tab showed only spot briefing/report-like cards, matching the known Phase 1 limitation.
- `Nearby` tab showed the honest empty state when no home/area match existed in the browser session.
- Quick actions remained visible and mode-aware.
- Browser-state issue observed: after cycling tabs, returning to `Latest` once showed an empty state even though the canonical API returned two eligible items. Initial homepage load rendered those two items correctly. This needs a small follow-up investigation before calling the deployed web behavior flawless.

### Remaining Risks

- Still a query-time homepage mixer, not an `activity_items` ledger.
- Offset cursor remains unstable under write churn.
- `Nearby` is string-area based.
- Media URL hydration still has per-card/N+1 risk.
- No true following graph.
- Live signed-in/member and `hide_item` behavior were not production-smoked due missing test token.
- Pseudonymous Chika live masking was not data-proven because sampled live Chika data was not pseudonymous.
- Recent commit history mixes feed hardening with unrelated page/community changes, which increases review and rollback risk.
- Full web test suite is not green due two known non-feed contract failures.

Go/no-go for Phase 2:
- **Go for Phase 2 planning and backend foundation work**, with the above issues accepted as Phase 1 closure issues.
- Do not treat Phase 1 as fully production-proven for signed-in behavior until a member test token/account smoke covers signed-in feed, authorized events, pseudonymous Chika if test data exists, and `hide_item` persistence.

## Phase 2 Activity Items Foundation

Date: 2026-05-19

Verdict: backend foundation implemented locally. `/v1/feed/home` remains stable and unchanged; the new ledger read path is exposed separately at `/v1/feed/activity`.

### Route Strategy

Chosen strategy: **Option B**.

- Keep `/v1/feed/home` on the Phase 1 query-time mixer.
- Add `GET /v1/feed/activity` for the `activity_items` foundation.
- Do not swap homepage internals yet. That avoids regressing the deployed public homepage while the ledger is backfilled, tested with member data, and compared against current home-feed behavior.

### Table And Index Summary

Added forward-only Goose migration:
- `services/fphgo/db/migrations/0034_feed_activity_items.sql`

Schema mirror updated:
- `services/fphgo/db/schema/000_schema.sql`

New table:
- `activity_items`

Key fields:
- normalized type/source/target identifiers
- actor user id
- visibility and state
- coarse area, dive site id, group id, event id
- occurred/source timestamps
- title/body
- JSONB media/stats/metadata

Indexes added for:
- public/latest cursor reads
- visibility cursor reads
- actor cursor reads
- group cursor reads
- dive-site cursor reads
- event cursor reads
- source lookup/idempotency

The migration does not remove or reset existing feed tables:
- `feed_impressions`
- `feed_actions`
- `user_hidden_feed_items`
- `user_feed_preferences`

### Source Types Covered

Implemented source activity types:
- `chika_thread_created`
- `dive_site_update_added`
- `event_published`
- `buddy_intent_created`
- `media_post_created`

Publisher hooks were added to the existing create/update paths:
- Chika thread creation
- Dive-site update creation
- Event create/update when status is published and visibility is eligible
- Buddy intent creation when active, member-visible, and unexpired
- Media post creation when tied to an approved dive site

Publishing is intentionally non-blocking. If the ledger upsert fails, the source write still succeeds; the idempotent backfill path is the repair mechanism.

Source transition hooks also mark ledger rows inactive for:
- deleted Chika threads
- deleted buddy intents
- events updated out of published/eligible visibility

### Source Types Deferred

Deferred intentionally:
- `chika_reply_added`
- `group_created`
- `group_post_created`
- `event_joined`
- `dive_site_saved`
- competitive records
- true following feed
- invite-only event feed exposure

Invite-only events remain excluded from the activity feed foundation until there is a clean viewer authorization contract for feed reads.

### Cursor Behavior

`GET /v1/feed/activity` uses keyset pagination:
- opaque base64 JSON cursor
- cursor contains `occurredAt` and `id`
- stable ordering is `occurred_at DESC, id DESC`
- no offset cursor on the new activity read path

Guests are capped to a smaller page size, but guest cursors are still honored so public pagination works.

### Privacy And Visibility Behavior

The activity read path enforces:
- guests see only `public`
- signed-in users may see `public` and `members`
- `group_members` requires active group membership
- `followers` is not exposed until a real follow graph exists
- `private` is never returned
- blocked users are suppressed
- hidden feed items are suppressed via `user_hidden_feed_items`
- actor-backed rows require active actor accounts
- live source checks suppress hidden/deleted/moderated source content

Chika activity rows preserve pseudonymous masking. For pseudonymous or locked-pseudonymous Chika threads, normal viewers do not receive the real actor id, username, avatar, or display name. The actor label is the thread pseudonym where available.

### Backfill Behavior

The migration backfills safe existing rows idempotently using the ledger uniqueness key:
- visible, non-deleted Chika threads
- active dive-site updates on approved dive sites
- published public/group-member events only
- active, unexpired, member-visible buddy intents
- active media posts with active media items on approved dive sites

The backfill excludes private, deleted, hidden, draft, cancelled, expired, and unsupported invite-only source rows.

### Verification Results

Commands run:
- `cd services/fphgo && goose -dir db/migrations validate` - failed locally because `goose` is not installed in PATH.
- `cd services/fphgo && go run github.com/pressly/goose/v3/cmd/goose@v3.24.1 -dir db/migrations validate` - passed.
- `cd services/fphgo && go test ./internal/features/feed/...` - passed.
- `cd services/fphgo && go test ./internal/features/chika/... ./internal/features/buddyfinder/... ./internal/features/events/... ./internal/features/explore/... ./internal/features/media/...` - passed.
- `cd services/fphgo && go test ./internal/app` - passed after fixing the route snapshot harness to include feed routes. The snapshot update also captured two pre-existing messaging routes.
- `pnpm --filter @freediving.ph/types test` - passed.
- `pnpm --filter @freediving.ph/web type-check` - failed due unrelated dirty Explore props: `ExploreResultsPanelProps` requires `hasAppliedBounds`, but `ExploreLayout.tsx` does not pass it.
- `pnpm --filter @freediving.ph/web test` - failed with two non-feed contract failures:
  - `apps/web/test/media-profile-flow-contract.test.mjs` expects `Apply to all`.
  - `apps/web/test/phase7-explore-contract.test.mjs` expects `isWithinBounds`.

### Remaining Risks

- `/v1/feed/home` is still the query-time homepage mixer.
- The new ledger endpoint is not yet wired into the web homepage.
- Phase 1 signed-in/member live smoke is still outstanding due missing `MEMBER_TOKEN`.
- Phase 1 `hide_item` live smoke is still outstanding.
- Live pseudonymous Chika masking is still not data-proven.
- One deployed browser-state issue remains: `Latest` once showed empty after tab cycling despite API items.
- Recent commits still mix feed and unrelated page/community changes.
- `Nearby` remains string-area based.
- No `activity_items` fanout, ranking, Redis, queue, realtime, or recommendation infrastructure exists by design.

Go/no-go for Phase 3:
- **Go for Phase 3 publisher/web-rendering planning after reviewing this foundation.**
- Do not route the production homepage to `/v1/feed/activity` until member live smoke, hide-item smoke, and a side-by-side activity-vs-home feed comparison are done with real test data.

## Phase 2 Verification

Date: 2026-05-19

Verdict: **Phase 2 verification PASS WITH ISSUES**. The backend activity ledger foundation is code-wise ready for web integration planning, but the repo is not clean and web verification is blocked by unrelated Explore/media drift.

### Repo State

- Branch: `main`.
- Recent commits include:
  - `6957d2b update explore`
  - `6944262 update pages`
  - `ad9e855 update feed and pages`
- Dirty Phase 2 feed files are mixed with unrelated dirty web/explore/media/profile/nav files.
- Do not stage the whole worktree for a feed commit. Feed-only staging must use explicit paths for `docs/feed`, `packages/types/src/feed.ts`, `packages/types/test/feed-contracts.test.ts`, `services/fphgo/db`, `services/fphgo/internal/app`, and touched `services/fphgo/internal/features/*` publisher/feed files.
- Unrelated dirty files to exclude from a feed commit include current Explore/nav/map/profile/media UI and tests unless intentionally pulled into a separate cleanup commit.

### Migration And Backfill

Verified:
- `0034_feed_activity_items.sql` is forward-only; Down is intentionally no-op.
- `activity_items` has visibility/state checks and source uniqueness.
- Indexes support public/latest, visibility, actor, group, dive-site, event, and source lookup paths.
- Existing feed tables remain intact: `feed_impressions`, `feed_actions`, `user_hidden_feed_items`, `user_feed_preferences`.
- Backfill is idempotent via `ON CONFLICT (source_module, source_type, source_id, type)`.
- Backfill excludes deleted/hidden Chika, inactive dive updates, unapproved dive sites, draft/cancelled/private/invite-only events, expired/non-member buddy intents, inactive actors, deleted media posts, and inactive media objects/items.

Command:
- `cd services/fphgo && go run github.com/pressly/goose/v3/cmd/goose@v3.24.1 -dir db/migrations validate` - passed.

### Endpoint Contract

Verified:
- `GET /v1/feed/activity` is mounted under `/v1/feed`.
- Query params:
  - `filter`: preferred activity filter.
  - `mode`: compatibility alias if `filter` is omitted.
  - `cursor`: opaque keyset cursor.
  - `region`: explicit area filter for `nearby`.
  - `limit`: capped server-side; guests capped lower.
- Filters supported:
  - `latest`
  - `nearby`
  - `chika`
  - `dive-reports`
  - `events`
- Legacy/unknown filters normalize safely:
  - `following -> latest`
  - `training -> latest`
  - `spot-reports -> dive-reports`
  - unknown -> `latest`
- Invalid cursor returns a validation error.
- Response shape is typed in Go DTOs and `packages/types/src/feed.ts`.
- Route snapshot now includes:
  - `GET /v1/feed/activity`
  - `GET /v1/feed/home`
  - `POST /v1/feed/actions`
  - `POST /v1/feed/impressions`

### Side-By-Side Comparison Notes

This was a code-wise/manual comparison, not a deployed runtime comparison. `/v1/feed/activity` is not deployed as the homepage path and should not replace `/v1/feed/home` yet.

- `latest`:
  - Home: scored query-time mixer over source tables with synthesized item IDs.
  - Activity: ledger rows ordered by `occurred_at DESC, id DESC`.
  - Difference is intentional; activity is chronological foundation, not a ranked clone.
- `nearby`:
  - Home: current query-time area behavior.
  - Activity: filters `activity_items.area` by explicit `region` or viewer home area.
  - Same limitation remains: string-area matching, not precise location.
- `chika`:
  - Home: `community_hot_post` cards from Chika candidates.
  - Activity: only `chika_thread_created`.
  - Pseudonymous actor masking is preserved.
- `dive-reports`:
  - Home: can include current Phase 1 dive report/site briefing behavior.
  - Activity: only `dive_site_update_added` and `media_post_created`.
  - Difference is intentional; approved dive-site briefing cards are not activity rows.
- `events`:
  - Home: eligible event candidates.
  - Activity: only `event_published` rows with live source checks.
- Buddy intents:
  - Home: member-only buddy signals may appear for members in mixed modes.
  - Activity: `buddy_intent_created` is `members` visibility and excluded from guests.

### Pagination

Verified by tests and code inspection:
- first page uses `occurred_at DESC, id DESC`
- next cursor points at the last returned visible row
- cursor is opaque base64 JSON with `occurredAt` and `id`
- guest cursors are honored after verification fixed the reset bug
- invalid cursors fail safely
- inserting a newer item between page requests should not corrupt the next page because the repo predicate is `(occurred_at, id) < (cursorOccurredAt, cursorID)`

### Privacy And Visibility

Verified by tests and repo query inspection:
- guests only see `public`
- signed-in users may see `public` and `members`
- `group_members` requires active group membership
- `followers` is explicitly excluded until a real follow graph exists
- `private` is explicitly excluded
- block relationships suppress rows
- `user_hidden_feed_items` suppress rows
- inactive actor accounts are suppressed
- live source-state checks suppress deleted/hidden/moderated/ineligible sources
- pseudonymous Chika actor fields are masked through activity mapping
- member-only buddy intents are not guest-visible
- event activity requires published source status and eligible source visibility

### Publisher Verification

Verified by source inspection:
- Chika publishes after successful thread creation, stores pseudonym only in metadata, and marks deleted thread activity deleted.
- Explore publishes after successful approved-site update creation.
- Events publish only when status is `published` and visibility is public/group-members; events moved out of eligibility mark ledger rows hidden.
- Buddy Finder publishes only active, unexpired, member-visible intents and marks deleted intents deleted.
- Media publishes after successful media post creation on an approved dive site with media ids/dimensions only.
- Publisher failures are non-blocking and do not corrupt source creation.

### Commands Run

- `git status --short` - dirty worktree; feed changes mixed with unrelated Explore/nav/media/profile changes.
- `git branch --show-current` - `main`.
- `git log --oneline -10` - latest `6957d2b update explore`.
- `cd services/fphgo && go run github.com/pressly/goose/v3/cmd/goose@v3.24.1 -dir db/migrations validate` - passed.
- `cd services/fphgo && go test ./internal/features/feed/...` - passed.
- `cd services/fphgo && go test ./internal/features/chika/... ./internal/features/buddyfinder/... ./internal/features/events/... ./internal/features/explore/... ./internal/features/media/...` - passed.
- `cd services/fphgo && go test ./internal/app` - passed.
- `pnpm --filter @freediving.ph/types test` - passed.
- `pnpm --filter @freediving.ph/web type-check` - failed due unrelated Explore prop mismatch.
- `pnpm --filter @freediving.ph/web test` - failed due non-feed media/explore contract drift.
- `git diff --check` - passed.

### Known Failures

- Web type-check:
  - `apps/web/src/features/explore/components/ExploreLayout.tsx` does not pass `hasAppliedBounds` required by `ExploreResultsPanelProps`.
- Web tests:
  - `apps/web/test/media-profile-flow-contract.test.mjs` expects `Apply to all`.
  - `apps/web/test/phase7-explore-contract.test.mjs` expects `isWithinBounds`.

### Web Integration Go/No-Go

Web integration for `/v1/feed/activity` can start only after the unrelated web type-check failure is accepted or fixed. Do not swap the production homepage yet. The next step should be a hidden/dev activity-feed client or side-by-side web integration, not replacing `/v1/feed/home`.

### Pre-Integration Cleanup Gate

Date: 2026-05-19

Verdict: **Pre-integration cleanup PASS**.

- The previous `ExploreLayout.tsx` / `hasAppliedBounds` type-check blocker is cleared.
- `pnpm --filter @freediving.ph/web type-check` now passes.
- `pnpm --filter @freediving.ph/web test` now passes.
- The stale media/profile contract expecting `Apply to all` was updated to the current grouped-caption behavior: the composer shows "Caption applies to the whole post" and sends `applyCaptionToAll: false`.
- `apps/web/test/phase7-explore-contract.test.mjs` now passes with the current server-side bounds contract and no client-side `isWithinBounds` filtering.
- Feed safety checks still pass:
  - `cd services/fphgo && go test ./internal/features/feed/...`
  - `cd services/fphgo && go test ./internal/app`
  - `pnpm --filter @freediving.ph/types test`
  - `git diff --check`
- Dirty files remain mixed across feed backend, feed docs/types, route snapshots, Explore/nav/media/profile, and generated sqlc model files. They are now verification-clean, but commit isolation still matters: do not stage everything blindly.

Updated go/no-go:
- **Side-by-side web integration for `/v1/feed/activity` can start.**
- Do not replace `/v1/feed/home` yet.

## Phase 3 Side-By-Side Web Integration

Date: 2026-05-19

Verdict: **Side-by-side activity feed preview is wired code-wise.** The production homepage default still uses `/v1/feed/home`; `/v1/feed/activity` is only used when the page is explicitly opened with `?feedSource=activity`.

### Source Selection

- `/` continues to render the existing home-feed mixer through `GET /v1/feed/home`.
- `/?feedSource=activity` renders the same homepage shell with feed items loaded from `GET /v1/feed/activity`.
- Invalid or missing `feedSource` values fall back to `home`.
- The server page normalizes the query param and passes a narrow `initialFeedSource` prop into the client feed page. This avoids making the normal homepage depend on `useSearchParams` hydration behavior.

### Web Client And Query Behavior

- Added a separate activity feed API client for `/v1/feed/activity`.
- Added a separate React Query hook with the key prefix `activity-feed`.
- The existing `home-feed` query key and `/v1/feed/home` client remain unchanged.
- Activity preview supports `filter`, compatibility `mode`, `cursor`, `region`, and `limit` query params.
- Switching modes or switching source resets cursor and rendered items before loading the next response.

### Adapter Behavior

- Activity rows are adapted into existing `HomeFeedItem` card shapes only for supported MVP activity types:
  - `chika_thread_created` -> `community_hot_post`
  - `dive_site_update_added` -> `post`
  - `event_published` -> `event`
  - `buddy_intent_created` -> `buddy_signal`
  - `media_post_created` -> `media_post` when media dimensions exist, otherwise a safe `post` fallback
- Unknown activity item types are skipped and only warn in development.
- The adapter preserves actor fields exactly as returned by the activity API. It does not reconstruct author IDs, usernames, display names, or profile hrefs for pseudonymous Chika.

### Telemetry Behavior

- Legacy `/v1/feed/impressions` and `/v1/feed/actions` telemetry remains enabled for the normal `/v1/feed/home` path.
- Activity preview disables legacy impression/action telemetry and hides card action buttons.
- This is intentional until activity feed IDs and entity types are formally supported by telemetry.

### Pagination Behavior

- Activity preview passes the activity endpoint `nextCursor` back as `cursor` without offset assumptions.
- The existing load-more UI remains the same.
- Mode/source changes reset the cursor and item list to avoid the previous class of stale empty-state issues after tab cycling.

### Verification Results

Commands run:
- `pnpm --filter @freediving.ph/web type-check` - passed.
- `pnpm --filter @freediving.ph/web test` - passed.
- `pnpm --filter @freediving.ph/types test` - passed.
- `cd services/fphgo && go test ./internal/features/feed/...` - passed.
- `git diff --check` - passed.

### Remaining Risks

- This is not a production cutover. `/v1/feed/home` remains the homepage default.
- Activity preview has not been browser-smoked against deployed signed-in data in this pass.
- Activity telemetry is deliberately deferred.
- The adapter is a compatibility bridge; it should not become the long-term card contract if activity-specific rendering diverges.
- Existing dirty Explore/backend files are still present in the worktree and must remain isolated from any feed-only commit.
- Phase 1 signed-in/member live smoke, `hide_item` live smoke, and live pseudonymous Chika data proof remain outstanding.

Cutover evaluation:
- **Can start after side-by-side browser/API smoke with real data.**
- Do not switch the default homepage source until activity preview parity, signed-in visibility, and telemetry strategy are accepted.

## Activity Feed Cutover Evaluation

Date: 2026-05-19

Verdict: **Cutover evaluation FAIL. Do not cut over yet.** The backend activity endpoint is live and functional for guest reads, but the side-by-side web preview is not deployed to `https://freediving.ph/?feedSource=activity`, signed-in smoke is blocked by lack of a member token, and live content density is thinner than the current home mixer.

### Deployment And Runtime Status

- Branch: `main`.
- Latest local commit at evaluation time: `a07b799 enhance feed and explore`.
- The local worktree remains dirty and mixed:
  - feed web integration: `apps/web/src/app/page.tsx`, `apps/web/src/features/home-feed/**`, `apps/web/src/lib/api/fphgo-routes.ts`, `apps/web/test/home-feed-activity-preview-contract.test.mjs`
  - feed docs: `docs/feed/feed-system-assessment.md`
  - unrelated Explore/profile/backend drift: current `apps/web/src/features/explore/**`, `apps/web/src/features/diveSpots/**`, `apps/web/src/features/profile/components/ProfileSkeleton.tsx`, `services/fphgo/internal/features/explore/**`, and related Explore tests
- Side-by-side web integration is not committed in the current local history and is not deployed to the live web app.
- `https://api.freediving.ph/v1/feed/activity` is deployed and returns `activity_items` rows, so migration/backfill is runtime-present in the target environment by API evidence. This is an inference from live endpoint behavior, not a direct production DB migration inspection.

### Guest API Smoke

Canonical API: `https://api.freediving.ph`.

Results:
- `GET /v1/feed/activity?filter=latest&limit=10` returned `200` with 2 public items:
  - `media_post_created`
  - `chika_thread_created`
- `GET /v1/feed/activity?filter=chika&limit=10` returned `200` with only `chika_thread_created`.
- `GET /v1/feed/activity?filter=dive-reports&limit=10` returned `200` with only `media_post_created`.
- `GET /v1/feed/activity?filter=events&limit=10` returned `200` with no items.
- `GET /v1/feed/activity?filter=nearby&region=Mabini&limit=10` returned `200` with no items.

Guest privacy notes:
- No member-only buddy intents appeared in guest results.
- No private, followers-only, group-only, or private event rows appeared in guest results.
- Pseudonymous Chika masking was not data-proven because the live Chika item was normal mode, not pseudonymous.
- Member-only buddy exclusion is not fully data-proven because no live member-only buddy item appeared in the guest result set.

### Signed-In API Smoke

Status: **blocked**.

- No `MEMBER_TOKEN` or safe member bearer token was available in the local environment.
- Signed-in checks for member-only buddy intents, group membership visibility, block suppression, hidden item suppression, and normal-viewer pseudonymous Chika masking remain unproven live.

### Pagination Smoke

Guest pagination was smoke-tested live:
- `GET /v1/feed/activity?filter=latest&limit=1` returned the newest activity row and a `nextCursor`.
- Reusing that `nextCursor` returned the next older item with no duplicate ID.
- Ordering was stable by observed `occurredAt` descending:
  - `2026-05-19T11:17:17Z`
  - `2026-05-19T09:57:33Z`
- `GET /v1/feed/activity?filter=latest&cursor=bad-cursor` returned `400` with `validation_error` and cursor issue `invalid cursor`.

Signed-in pagination remains blocked with the missing member token.

### Deployed Web Preview Smoke

Status: **failed / not deployed**.

- Opened `https://freediving.ph/?feedSource=activity`.
- The page loaded, but it did not show the `Activity feed preview` indicator.
- DOM still rendered legacy home feed IDs and types:
  - `fi_media_...` / `media_post`
  - `fi_community_...` / `community_hot_post`
  - `fi_spot_...` / `dive_spot`
- Save / Not interested actions were still visible, which means the deployed page is using the old home feed path, not the local activity preview behavior where telemetry/actions are disabled.
- Normal `https://freediving.ph/` still works and has not accidentally cut over.

Conclusion:
- The frontend side-by-side integration must be deployed before a real web cutover evaluation can be completed.

### Home Vs Activity Comparison

API comparison for latest:
- `/v1/feed/home?mode=latest&limit=10` returned 3 items:
  - `media_post`
  - `community_hot_post`
  - `dive_spot`
- `/v1/feed/activity?filter=latest&limit=10` returned 2 items:
  - `media_post_created`
  - `chika_thread_created`

Mode comparison:
- Home `dive-reports` returned 10 `dive_spot` briefing/discovery cards.
- Activity `dive-reports` returned 1 `media_post_created` row.
- Home `nearby&region=Mabini` returned 1 `dive_spot`.
- Activity `nearby&region=Mabini` returned 0 items.
- Both home and activity `events` returned 0 items.

Product read:
- Activity is more correct as a real activity ledger.
- Home currently has better content density because it includes discovery/briefing cards.
- Activity is too thin to become the default homepage without either more backfilled source coverage or an accepted product decision that the homepage should be sparse but truthful.

### Telemetry And Actions

Recommendation: **Option A before cutover.**

- Wire activity item IDs and source/entity mappings into feed telemetry before default migration.
- Ensure `hide_item` works for activity-backed cards and suppresses future activity results.
- Do not silently cut over with impressions/actions disabled unless the product explicitly accepts losing that behavior.

Current status:
- Activity preview intentionally disables legacy feed impressions/actions locally.
- Live web preview is not deployed, so telemetry-disabled preview behavior is not runtime-proven.

### Verification Commands

Commands run:
- `git status --short` - dirty worktree with feed integration plus unrelated Explore/profile/backend drift.
- `git diff --stat` - dirty diff spans feed web/docs plus unrelated Explore/profile/backend files.
- `git log --oneline -10` - latest local commit `a07b799 enhance feed and explore`.
- guest `curl` smoke against `https://api.freediving.ph/v1/feed/activity` filters - passed for endpoint availability and contract shape.
- guest keyset pagination smoke - passed.
- invalid cursor smoke - passed with `400 validation_error`.
- deployed browser smoke for `https://freediving.ph/?feedSource=activity` - failed because preview integration is not deployed.
- deployed browser smoke for `https://freediving.ph/` - passed; no accidental cutover.
- `pnpm --filter @freediving.ph/web type-check` - passed.
- `pnpm --filter @freediving.ph/web test` - passed.
- `pnpm --filter @freediving.ph/types test` - passed.
- `cd services/fphgo && go test ./internal/features/feed/...` - passed.
- `cd services/fphgo && go test ./internal/app` - passed.
- `git diff --check` - passed.

### Remaining Risks

- Side-by-side web integration is not deployed.
- Signed-in/member activity smoke is blocked by missing `MEMBER_TOKEN`.
- `hide_item` live smoke remains unproven for activity rows.
- Live pseudonymous Chika masking remains unproven due missing pseudonymous test data.
- Activity feed content density is currently lower than `/v1/feed/home`.
- Activity `nearby` remains string-area based and returned no Mabini result in live guest smoke.
- Activity telemetry/actions are not ready for cutover.
- Worktree remains mixed with unrelated Explore/profile/backend changes; commit/review isolation is mandatory.

Cutover recommendation:
- **Do not cut over yet.**
- Next step is to deploy the side-by-side web preview, obtain a safe member token/test account, run signed-in live smoke, and decide/implement activity telemetry and hide behavior before default migration.

## Do Not Build Yet

- ML ranking
- embeddings
- collaborative filtering
- precomputed fanout per user
- notification push system
- recommendation infrastructure
- graph exploration beyond a simple follow/buddy relationship source
- Redis queues or stream processors
- realtime feed updates
- complex moderation automation
- user-interest inference beyond explicit preferences and lightweight behavior penalties
- public exposure of private messaging or buddy-request state
- precise personal location feed logic
