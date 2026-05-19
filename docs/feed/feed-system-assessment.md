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
- Modes are not hard filters.
- `latest` returns the current eligible mixed feed.
- `nearby` requires the viewer home area or explicit `region` to match item areas.
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
- No route currently writes `user_hidden_feed_items` when the user taps `not_interested` or save. It logs feedback; it does not fully enforce hide semantics unless a separate row exists.

## Current DB State

Feed-specific tables:
- `feed_impressions`
- `feed_actions`
- `user_feed_preferences`
- `user_hidden_feed_items`

There is no `feed_items` or `activity_items` table. Current feed identity is synthesized as strings such as `fi_post_<id>`, `fi_media_<id>`, `fi_community_<id>`, `fi_spot_<id>`, `fi_event_<id>`, and `fi_buddy_<id>`.

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
| Chika threads | `chika_threads`, `chika_categories`, reactions/comments | Thread creation/trending card | `mode`, `hidden_at`, `deleted_at`, category `pseudonymous` | Current feed leaks real author fields for pseudonymous Chika; this must be fixed before wider feed launch |
| Chika replies/comments | `chika_posts`, `chika_comments` | Reply activity could be useful | `deleted_at`, `hidden_at`, pseudonyms | Not currently emitted; must preserve pseudonymous actor behavior |
| Buddy intents | `buddy_intents` | Active buddy call cards | `visibility = 'members'`, `state`, `expires_at` | Current feed exposes member-only buddy intents to guests because `/v1/feed/home` is public. That is a launch blocker |
| Buddy requests | `buddy_requests`, `buddies` | Relationship activity only if explicitly public/follower-scoped | `status` | Should not appear in public/community feed by default |
| Dive sites | `dive_sites`, `dive_site_saves` | Spot briefing, saved/bucket-list related activity | `moderation_state`, verification fields | Public approved sites are safe |
| Condition reports | `dive_site_updates` | Strong feed source | `state`, site moderation | Good source, but location should stay at dive-site/area level, not precise personal location |
| Groups | `groups`, `group_posts`, `group_memberships` | Group creation/posts/activity | `groups.visibility`, `groups.status`, `group_posts.status`, `deleted_at`, membership | Not currently included except events; needs member-aware filtering |
| Events | `events`, `event_memberships` | Published events, joined events | `status`, `visibility`, `group_id`, membership | Current feed query does not filter `status` or `visibility`; this is a launch blocker |
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

### Missing Or Broken In Current Feed

- Buddy intents have `visibility = 'members'`, but feed home is public and the buddy-intent candidate query does not exclude guests. Public feed should not show member-only buddy posts.
- Event candidates ignore `events.status` and `events.visibility`. Draft, invite-only, group-member, cancelled, or completed events can be pulled unless hidden by unrelated logic. That is not acceptable.
- Chika feed cards expose `authorUserId`, `authorName`, and `authorUsername` even for pseudonymous or locked pseudonymous threads. That violates the Go service AGENTS rule: protect pseudonymous Chika identity.
- Community candidate query does not check `users.account_status = 'active'`.
- Buddy intent query does not check `users.account_status = 'active'`.
- Dive-site update candidate query does not check `users.account_status = 'active'`.
- Group visibility is not enforced because group posts are not currently feed sources; it must be enforced before adding them.
- Hidden/not-interested currently logs telemetry but does not necessarily create `user_hidden_feed_items`, so "hide" and "not interested" are not the same thing.
- `user_feed_preferences` is unused.
- No clear coarse-location policy exists for feed payloads beyond area/dive-site fields.
- No feed-level contract says which source modules are guest-safe versus member-only.

Minimum required before launch of the rewritten feed:
- Server-side visibility policy per source type.
- Chika pseudonymous actor mapping in feed responses.
- Event status/visibility filtering.
- Buddy-intent guest exclusion or public-safe preview policy.
- User account status suppression.
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
  source_id TEXT NOT NULL,
  actor_app_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  visibility TEXT NOT NULL,
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
  state TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_module, type, source_id),
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
  ON activity_items (actor_app_user_id, occurred_at DESC, id DESC)
  WHERE state = 'active';

CREATE INDEX idx_activity_items_group_cursor
  ON activity_items (group_id, occurred_at DESC, id DESC)
  WHERE state = 'active' AND group_id IS NOT NULL;

CREATE INDEX idx_activity_items_site_cursor
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
  - `GET /v1/feed?filter=<filter>` if adding a new endpoint
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
