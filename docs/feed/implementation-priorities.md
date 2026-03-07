# Feed Implementation Priorities

## Priority 0: Contract Lock And Source Audit

### Goal
Stop contract drift before engineering starts.

### Backend tasks (`services/fphgo`)
- Define response envelope for `GET /v1/feed/home`.
- Define cursor format and invalid cursor behavior.
- Audit source tables and required joins:
  - posts
  - chika/community
  - dive sites
  - events
  - buddy intents
  - follows/blocks/saves/preferences
  - records (if included in first cut)
- List missing indexes and missing data needed for scoring.

### Frontend tasks (`apps/web`)
- Freeze homepage composition blocks:
  - hero context
  - quick actions
  - nearby condition card
  - feed mode tabs
  - mixed feed list
- Define strict TS discriminated union for feed items.
- Remove any plan that assembles mixed feed client-side.

### Cross-team deliverables
- Final mode semantics (`following`, `nearby`, `training`, `spot-reports`).
- Action taxonomy for telemetry.
- Error handling contract for feed and telemetry endpoints.

### Exit criteria
- API and web agree on exact payload shapes.
- No frontend mock contract that differs from backend contract.
- Missing schema/index list is approved.

---

## Priority 1: Backend Feed Foundation

### Goal
Ship real mixed feed responses from Go API with stable pagination and safety filters.

### Build sequence
1. Add feed feature module under `services/fphgo/internal/features/feed`.
2. Implement candidate queries per entity type.
3. Implement per-type scoring functions.
4. Implement score normalization + merge + diversity re-rank.
5. Implement `GET /v1/feed/home`.
6. Implement telemetry write endpoints:
   - `POST /v1/feed/impressions`
   - `POST /v1/feed/actions`
7. Add migrations + indexes for telemetry and performance.

### Hard rules to enforce in service layer
- Suppress blocked/hidden/muted content.
- Suppress low-trust and moderated-out content.
- Avoid creator saturation (max consecutive density).
- Avoid duplicate entity repeats in a page.

### Exit criteria
- Endpoint returns mixed feed with cursor pagination.
- Reasons are attached per item for internal debugging.
- Telemetry writes succeed and are idempotent enough for retries.
- Query latency is acceptable for homepage p95 target.

---

## Priority 2: Web Homepage Integration

### Goal
Replace mock homepage feed with API-driven mixed feed rendering.

### Build sequence
1. Create `apps/web/src/features/home-feed/`.
2. Add API clients:
   - `get-home-feed.ts`
   - `post-feed-impressions.ts`
   - `post-feed-actions.ts`
3. Add query/mutation hooks and impression tracker.
4. Implement `FeedItemRenderer` + type-specific cards.
5. Wire infinite scroll and mode switching.
6. Replace homepage mock content in `apps/web/src/app/page.tsx` with thin feature entry.

### UX constraints
- Distinct card density by entity type.
- No layout jump on initial load.
- Smooth mode switch with cursor reset.
- Strong empty/error states per mode.

### Exit criteria
- Homepage uses feed endpoint as source of truth.
- No client-side mixed-feed composition logic.
- Impression and action events are emitted correctly.
- Cursor pagination is stable across mode switches.

---

## Priority 3: Personalization And Quality Tuning

### Goal
Make the feed adapt without introducing ML complexity.

### Backend tuning
- Add mode multipliers.
- Add recent behavior boosts (opens/saves/joins/views).
- Add hide/not-interested penalties.
- Tune composition targets and diversity rules per mode.

### Frontend tuning
- Emit richer action taxonomy:
  - open thread/post/event
  - save spot
  - message buddy
  - hide / not interested
- Send session context where useful (session id, mode, list position).

### Exit criteria
- Modes are observably different in composition.
- Repetition rate drops.
- Hidden/not-interested feedback changes future ranking.

---

## Priority 4: Production Hardening

### Goal
Prevent feed regressions and cold-start failures under real traffic.

### Backend hardening
- Optimize expensive candidate queries.
- Add fallback candidate generation for source starvation.
- Add read-model/materialized views only when proven needed.
- Add feed health metrics and alerts.

### Frontend hardening
- Add resilient retry behavior.
- Add optimistic updates for reversible actions.
- Add graceful fallback UI for low-data users.

### Cold start policy
- User cold start uses:
  - onboarding interests
  - selected region
  - local popular/trending content
- Content cold start uses:
  - small exploration quota
  - trust-weighted lift for quality new content

### Exit criteria
- No broken-feed scenario for new users.
- Stable p95 latency and error budget.
- Feed observability dashboard exists and is actionable.
