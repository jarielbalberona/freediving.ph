# ExecPlan Policy

## Purpose

An ExecPlan is a living implementation plan for complex work. It must stay current as facts, risks, and decisions evolve.

## When ExecPlan Is Mandatory

Create an ExecPlan before coding when any of the following are true:

- Changes span multiple workspaces (`apps/*` + `packages/*`), or multiple apps.
- Shared contracts or utilities change (`packages/types`, `packages/utils`, `packages/config`, `packages/db`, `packages/ui`).
- DB schema/migration behavior changes.
- Auth/security, middleware, request validation, or infra/runtime behavior changes.
- The change is large enough to require staged milestones and checkpoints.

## Constraints

- Do not touch `apps/api`; it is legacy. All API work belongs in `services/fphgo`.

## Required Standard

- Plans must be self-contained: a contributor can execute from the plan without hidden context.
- Plans must be evidence-driven: all repo claims should reference checked files/scripts/paths.
- Unknowns must be called out explicitly; do not guess.
- Validation is required for every completed milestone.
- For risky actions, include rollback notes before execution.

## Canonical Lifecycle

1. **Spec + acceptance lock** — Capture exact scope, non-goals, constraints, and acceptance criteria.
2. **Repo-aware discovery** — Inspect actual workspace scripts, source structure, and config files; record concrete evidence paths.
3. **Milestone implementation** — Execute in small, reversible milestones; keep each milestone scoped to one intent.
4. **Evidence-driven verification** — Run the narrowest valid checks first, then broaden as risk grows.
5. **Post-pass review** — Validate regressions, boundary impacts, and docs/config consistency.
6. **Follow-through** — Update plan status, changed-file list, and residual risks.

## ExecPlan Section Order

1. Title  
2. Objective  
3. Scope  
4. Constraints And Non-Goals  
5. Acceptance Criteria  
6. Repo Evidence  
7. Risks And Rollback  
8. Milestones  
9. Verification Plan  
10. Progress Log  
11. Outcomes And Follow-Ups  

## Milestone Template

```
### Milestone <N>: <Name>
- Goal:
- Inputs/Dependencies:
- Changes:
- Validation Commands:
- Expected Evidence:
- Rollback Notes:
- Status: `pending | in_progress | done`
```

## Verification Playbooks

### Workspace-Targeted (Preferred First)

- API: `pnpm --filter @freediving.ph/api type-check` | `lint` | `test`
- Web: `pnpm --filter @freediving.ph/web type-check` | `lint` | `test`
- Shared packages: `pnpm --filter @freediving.ph/types test` (and similar for utils, config, ui, db)

### Cross-Workspace Or Release-Level

- `pnpm typecheck` | `pnpm lint` | `pnpm test` | `pnpm build` | `pnpm preflight`

### Go Service

- `cd services/fphgo && make sqlc`
- `cd services/fphgo && go test ./...`

## Formatting Rules

- In chat: output ExecPlan as one fenced `md` block.
- In file form: append new plans below this policy; do not wrap with an outer code fence.

---

# ExecPlan: Dive Site Submission Map-Pin Contract

## 1. Title

Dive site submission map-pin UX and server-side area derivation

## 2. Objective

Replace manual area and coordinate entry with a map-pin flow in `apps/web`, and enforce a server-derived coarse area in `services/fphgo` so the API no longer trusts client-provided area strings.

## 3. Scope

- `apps/web` dive site submission form and map picker dialog.
- `packages/types` explore submission request contract.
- `services/fphgo` explore submission DTO/service behavior and reverse geocoding client.
- Targeted tests for the new request validation and web submission flow wiring.

## 4. Constraints And Non-Goals

- Do not touch `apps/api/*`.
- Keep `services/fphgo` handlers thin and continue using `httpx.DecodeAndValidate[T]`.
- Do not change the DB schema for `dive_sites.area`; only change how it is derived.
- Non-goal: exact-address capture or storage.
- Non-goal: Redis/external cache infrastructure for geocoding in v1.

## 5. Acceptance Criteria

- Submission UI removes manual `area`, `latitude`, and `longitude` inputs.
- Users must choose a location via a map picker before submit.
- Submission requests send only `lat` and `lng` for location.
- `services/fphgo` reverse geocodes `lat`/`lng` into coarse `{cityOrMunicipality}, {province}` before persistence.
- Reverse-geocode failure returns a `400 validation_error` with issue path `["location"]`, code `invalid_location`, and the requested message.
- Tests cover request validation, geocode-to-area persistence flow, geocode failure behavior, and web payload/UI wiring.

## 6. Repo Evidence

- Current submit page still exposes manual location fields: `apps/web/src/app/explore/submit/page.tsx`
- Current form schema still validates manual area/coordinate entry: `apps/web/src/features/diveSpots/schemas/siteSubmission.schema.ts`
- Shared explore submission contract currently includes client `area`: `packages/types/src/index.ts`
- Go explore submission DTO currently accepts client `area`: `services/fphgo/internal/features/explore/http/dto.go`
- Go explore handler already uses `httpx.DecodeAndValidate[T]`: `services/fphgo/internal/features/explore/http/handlers.go`
- Go explore service currently trusts client-provided area when creating submissions: `services/fphgo/internal/features/explore/service/service.go`
- Existing Google Maps provider in web: `apps/web/src/providers/map-provider.tsx`

## 7. Risks And Rollback

- Risk: introducing reverse geocoding without injection points creates brittle tests and runtime failure coupling.
- Risk: map-picker UI can become untestable if it hard-depends on live Google Maps state.
- Risk: dirty local worktree means broad rewrites could trample unrelated edits.
- Rollback Notes:
  - Revert the new reverse geocoder wiring and restore the prior request contract if runtime issues surface.
  - Revert the submit-page component split if the dialog integration causes regressions.

## 8. Milestones

### Milestone 1: Contract and service foundation
- Goal: update shared types, Go DTOs, and service behavior to require `lat`/`lng` and derive area server-side.
- Inputs/Dependencies:
  - `packages/types/src/index.ts`
  - `services/fphgo/internal/features/explore/http/dto.go`
  - `services/fphgo/internal/features/explore/service/service.go`
  - `services/fphgo/internal/config/config.go`
- Changes:
  - remove request `area`
  - add reverse geocoder interface/client
  - derive coarse area before repo create
- Validation Commands:
  - `go test ./internal/features/explore/...`
  - `pnpm --filter @freediving.ph/types test`
- Expected Evidence:
  - submission service rejects missing/invalid coordinates
  - derived area passed into repo create path
- Rollback Notes:
  - revert contract and service changes before web wiring if geocoding behavior is unstable
- Status: `done`

### Milestone 2: Web submission UX
- Goal: replace manual location entry with a map-pin dialog and derived area display.
- Inputs/Dependencies:
  - `apps/web/src/app/explore/submit/page.tsx`
  - `apps/web/src/providers/map-provider.tsx`
  - `apps/web/src/components/ui/dialog.tsx`
- Changes:
  - add map picker dialog
  - store nested `location` form value
  - disable submission until a pin is selected
  - submit only `lat` and `lng`
- Validation Commands:
  - `pnpm --filter @freediving.ph/web test`
  - `pnpm --filter @freediving.ph/web type-check`
- Expected Evidence:
  - form source no longer contains manual area/coordinate inputs
  - payload wiring excludes area
- Rollback Notes:
  - revert submit-page changes while keeping backend contract isolated if web UX fails review
- Status: `done`

### Milestone 3: Verification and cleanup
- Goal: add targeted tests and verify no contract drift.
- Inputs/Dependencies:
  - updated web and Go code from milestones 1-2
- Changes:
  - add Go tests for validation/geocode behavior
  - add web contract tests for dialog/payload wiring
  - run narrow checks and record outcomes
- Validation Commands:
  - `go test ./internal/features/explore/...`
  - `pnpm --filter @freediving.ph/types test`
  - `pnpm --filter @freediving.ph/web test`
  - `pnpm --filter @freediving.ph/web type-check`
- Expected Evidence:
  - all targeted checks pass or known blockers are documented
- Rollback Notes:
  - revert only failing milestone-specific files; avoid touching unrelated dirty-worktree changes
- Status: `done`

## 9. Verification Plan

- `cd services/fphgo && go test ./internal/features/explore/...`
- `pnpm --filter @freediving.ph/types test`
- `pnpm --filter @freediving.ph/web test`
- `pnpm --filter @freediving.ph/web type-check`

## 10. Progress Log

- 2026-03-01: Audited existing explore submission flow in web, shared types, and `services/fphgo`; confirmed the current implementation still trusts client-provided area and exposes manual area/coordinate inputs.
- 2026-03-01: Updated the shared submission contract to require `lat` and `lng`, added a server-side Google reverse geocoder client, and derived coarse area in the explore service before persistence.
- 2026-03-01: Replaced manual location inputs in the web submit form with a full-screen map-pin dialog, read-only pinned-area summary, and submit gating until a pin is selected.
- 2026-03-01: Added Go tests for coordinate validation and geocode failure/storage behavior, plus a web contract test for the map-pin submission flow. Verified `pnpm --filter @freediving.ph/types test`, `pnpm --filter @freediving.ph/web type-check`, targeted web contract test, and `go test ./internal/features/explore/...`.
- 2026-03-01: Full `pnpm --filter @freediving.ph/web test` still fails on pre-existing unrelated contract/smoke tests (`best-addon-mvp1-contract`, `explore-buddy-site-contract`, `phase6-frontend-hardening-contract`, and `fphgo-ci-smoke` env dependency).

## 11. Outcomes And Follow-Ups

# ExecPlan: FPH Media Post Composer And Profile Masonry

## 1. Title

FPH media post domain model, publish flow, and profile masonry gallery

## 2. Objective

Implement end-to-end photo posting for Freediving Philippines by reusing the existing raw media uploader, adding a domain-level media post model in `services/fphgo`, and replacing the current stub `/[username]/create` and profile grid UI in `apps/web` with a real composer and masonry gallery.

## 3. Scope

- `services/fphgo` DB migrations, `sqlc` queries, repo/service/http layers, and route wiring for media posts and profile media reads.
- `packages/types` request/response contracts for media posts and profile media gallery items.
- `apps/web` media feature hooks/components for raw upload, publish, create-page composer, and profile masonry integration.
- Targeted tests for Go service/http behavior and web contract/type coverage where practical.

## 4. Constraints And Non-Goals

# ExecPlan: Home Feed Product Discipline And Recognizable Card Types

## 1. Title

Home feed ranking discipline, mode identity, and recognizable card chrome

## 2. Objective

Tighten the `/` feed so it behaves like an intentional freediving community surface instead of a generic mixed-content list by enforcing clearer mode framing, better item composition/ranking in `services/fphgo`, and unmistakable feed item type identity in `apps/web`.

## 3. Scope

- `packages/types` feed contracts if new mode/card metadata is required.
- `services/fphgo` feed service/http layers for composition, ranking, and explanatory metadata.
- `apps/web` feed hero/tabs/list/card components for mode framing and per-item type recognition.
- Targeted tests for shared contracts, Go feed behavior, and web type-check coverage.

## 4. Constraints And Non-Goals

- Do not touch `apps/api/*`.
- Keep the home feed route contract backward-compatible where possible; add metadata rather than replacing existing fields unless necessary.
- Do not invent a recommendation engine or new persistence layer in this pass.
- Non-goal: full feed interaction redesign across the app.
- Non-goal: adding new feed modes beyond the current four.

## 5. Acceptance Criteria

- Each feed mode exposes a clearer product identity in the UI.
- Feed items include stable metadata that identifies their type and reason for ranking.
- The Go feed service enforces a more disciplined first-page mix and ranking bias per mode instead of returning a loosely ordered blended list.
- Every rendered feed card displays recognizable type chrome so users can distinguish posts, buddies, events, spot reports, records, and discovery cards at a glance.
- Quick actions and empty states better reinforce the intended feed behaviors for social/community use.

## 6. Repo Evidence

- Shared feed contract currently contains only generic item fields and no ranking explanation metadata: `packages/types/src/feed.ts`
- Feed assembly/ranking lives in the Go feed service: `services/fphgo/internal/features/feed/service/service.go`
- Feed HTTP DTO currently mirrors only basic item content: `services/fphgo/internal/features/feed/http/dto.go`
- The web home page currently uses generic hero/tab/feed components with weak mode framing: `apps/web/src/features/home-feed/components/HomeFeedPage.tsx`, `apps/web/src/features/home-feed/components/HomeHero.tsx`, `apps/web/src/features/home-feed/components/FeedModeTabs.tsx`
- Card renderers currently differ mostly by body layout and lack consistent type labeling: `apps/web/src/features/home-feed/components/cards/*.tsx`

## 7. Risks And Rollback

- Risk: changing feed ordering without tests can produce regressions that are hard to spot visually.
- Risk: shared contract expansion can drift between Go and TypeScript if not updated together.
- Risk: dirty local worktree means broad edits must stay isolated to feed-related files.
- Rollback Notes:
  - Revert feed contract additions first if downstream callers break.
  - Revert Go feed ranking changes independently from web card chrome if ranking behavior regresses.
  - Revert UI chrome changes independently if they hurt readability while keeping backend metadata in place.

## 8. Milestones

### Milestone 1: Contract and feed-strategy foundation
- Goal:
  - Add feed metadata needed for recognizable cards and ranking rationale; inspect and tighten current Go composition rules.
- Inputs/Dependencies:
  - `packages/types/src/feed.ts`
  - `services/fphgo/internal/features/feed/service/models.go`
  - `services/fphgo/internal/features/feed/service/service.go`
  - `services/fphgo/internal/features/feed/http/dto.go`
- Changes:
  - add stable item-type display metadata if needed
  - add rank/explanation metadata from backend
  - codify per-mode prioritization and first-page composition constraints
- Validation Commands:
  - `pnpm --filter @freediving.ph/types test`
  - `cd services/fphgo && go test ./internal/features/feed/...`
- Expected Evidence:
  - feed response exposes richer item metadata
  - mode-specific ordering logic is explicit in service code
- Rollback Notes:
  - revert contract additions before touching web if shape causes breakage
- Status: `done`

### Milestone 2: Web mode framing and recognizable card chrome
- Goal:
  - Make mode identity obvious and every feed item type visually recognizable without reading the whole card.
- Inputs/Dependencies:
  - `apps/web/src/features/home-feed/components/*`
  - `apps/web/src/features/home-feed/components/cards/*`
- Changes:
  - strengthen hero/tab copy by mode
  - add shared card chrome for type label / ranking reason
  - tighten quick actions and empty states around desired feed behaviors
- Validation Commands:
  - `pnpm --filter @freediving.ph/web type-check`
- Expected Evidence:
  - cards show stable type labels and clearer distinctions
  - UI framing changes with mode instead of just swapping content
- Rollback Notes:
  - revert shared card wrapper and mode copy if readability regresses
- Status: `done`

### Milestone 3: Verification and residual-risk pass
- Goal:
  - Verify the feed changes compile and document any remaining gaps.
- Inputs/Dependencies:
  - updated feed code from milestones 1-2
- Changes:
  - add or update targeted tests where practical
  - run narrow checks and record outcomes
- Validation Commands:
  - `pnpm --filter @freediving.ph/types test`
  - `pnpm --filter @freediving.ph/web type-check`
  - `cd services/fphgo && go test ./internal/features/feed/...`
- Expected Evidence:
  - targeted checks pass or blockers are documented with concrete scope
- Rollback Notes:
  - revert only milestone-specific files if a verification blocker is introduced
- Status: `done`

## 9. Verification Plan

- `pnpm --filter @freediving.ph/types test`
- `pnpm --filter @freediving.ph/web type-check`
- `cd services/fphgo && go test ./internal/features/feed/...`

## 10. Progress Log

- 2026-03-09: Audited the current feed route in `apps/web`, the shared feed contract in `packages/types`, and the Go feed service entrypoints to confirm the existing implementation lacks strong mode framing, ranking explanation metadata, and shared card identity chrome.
- 2026-03-09: Added feed presentation metadata to the shared contract and Go feed response, strengthened per-mode ranking multipliers and mix/priority ordering, and added targeted Go tests for feed strategy helpers.
- 2026-03-09: Reworked the web feed framing with mode-specific hero/tabs, live quick-action links, stronger empty states, and a shared feed card shell so item types and rank rationale are visually obvious at a glance.
- 2026-03-09: Verified `pnpm --filter @freediving.ph/types test`, `pnpm --filter @freediving.ph/web type-check`, and `cd services/fphgo && go test ./internal/features/feed/...`.
- 2026-03-09: Follow-up scope added: redesign cards to be denser and more legible, wire real detail/profile links per feed entity where routes exist, and include media/photo posts in the home feed using the existing media-post stack.

## 11. Outcomes And Follow-Ups

- Do not touch `apps/api`; it is legacy.
- Reuse `POST /v1/media/upload` and `POST /v1/media/upload-multiple` for raw uploads. Do not overload them with post persistence.
- Keep Go handlers thin, business rules in service, repo layer DB-only.
- `react-photo-album` masonry is required for the profile gallery.
- Max 10 uploaded photos per post; max 5 MB per file in the new composer flow even though the existing uploader context currently allows more.
- Dive site must come from approved FPH dive-site data, not free text.
- Videos are schema/model-ready only. No video upload/create UI in this milestone.
- Non-goal: mixed photo/video composer, lightbox ecosystem, crop/filter tools, arbitrary location text, feed ranking changes.

## 5. Acceptance Criteria

- `/[username]/create` lets the owner select 1-10 photos, rejects files over 5 MB, previews them immediately, and supports carousel-style review with per-item removal while preserving order.
- Composer requires a dive site from FPH dive-site data before publish.
- Composer supports per-photo captions plus an apply-to-all caption toggle.
- Frontend uploads raw files through the existing uploader endpoint, then publishes one logical media post referencing those uploads.
- Backend persists one grouped post/upload session plus multiple independently renderable media items with required width/height on photos.
- Public profile media is returned paginated with width/height and dive-site metadata, and the profile renders those items in a masonry layout using actual intrinsic dimensions.
- Video support exists in the data model but is rejected in the current publish flow.

## 6. Repo Evidence

# ExecPlan: Buddies Hub Completion, Privacy Alignment, And Experience Rewrite

## 1. Title

Buddies hub completion, Buddy Finder privacy correction, and `/buddies` experience rewrite

## 2. Objective

Turn `/buddies` from a confused Buddy Finder-only feed into a coherent buddies hub that:

- exposes the real buddy relationship workflow already present in `services/fphgo`
- keeps Buddy Finder as one part of the surface instead of the entire surface
- fixes the current privacy mismatch between public claims and actual guest-visible data
- rewrites the page copy and visual hierarchy so the product sounds and feels deliberate instead of sloppy

## 3. Scope

- `apps/web` `/buddies` page information architecture, copy, and component structure.
- `apps/web` buddy relationship UI for incoming/outgoing requests, current buddies, and relationship actions.
- `apps/web` Buddy Finder UI adjustments for guest/member separation, post management, and wording cleanup.
- `services/fphgo` Buddy Finder read-contract alignment for guest-safe vs member-safe fields.
- `services/fphgo` docs cleanup where live behavior drifted from the documented contract.
- Shared contracts in `packages/types` only if the API response shapes need explicit guest/member separation.

## 4. Constraints And Non-Goals

- Do not touch `apps/api`; it is legacy.
- Keep new API work in `services/fphgo` only.
- Do not broaden the surface into an all-new social system. Fix the current product, do not invent three more products.
- Do not expose exact coordinates, direct contact details, or unrestricted public profile data through Buddy Finder.
- Preserve the messaging pending/active trust model; Buddy Finder should start message flow, not bypass it.
- Non-goal: real mutual-buddy graph computation unless it is trivial and already supported cleanly by repo/service layers.
- Non-goal: advanced recommendation/ranking logic for Buddy Finder in this milestone.
- Non-goal: a dedicated `/buddies/[id]` detail experience unless there is a clear functional requirement after hub completion.

## 5. Acceptance Criteria

- `/buddies` clearly separates:
  - relationship management
  - active Buddy Finder listings
  - posting and self-management actions
- Signed-in members can:
  - view current buddies
  - view incoming requests
  - view outgoing requests
  - accept, decline, cancel, remove, and send buddy requests from the web UI
  - create and delete their own Buddy Finder intents
  - save and message from Buddy Finder cards where allowed
- Guests can:
  - browse a genuinely redacted Buddy Finder preview
  - never see fields that the product copy claims are hidden
- Guest Buddy Finder responses do not leak full notes, usernames, or other member-level profile details unless product explicitly decides they are public and the copy/docs are updated to match.
- `/buddies` copy no longer uses awkward phrasing like “DM request preview sent” and no longer over-promises privacy behavior.
- The page looks like a product hub, not a random marketing card glued to a CRUD form.
- Dead or misleading route/file artifacts are resolved, including the placeholder `apps/web/src/app/buddies/[id]/page.tsx`.
- Docs for Buddy Finder and buddies visibility match the live code after the work is complete.

## 6. Repo Evidence

- `/buddies` is currently Buddy Finder-only and does not use the real buddies relationship hooks/APIs:
  - `apps/web/src/app/buddies/page.tsx`
  - `apps/web/src/features/buddies/api/buddy-finder.ts`
- Real buddy relationship API clients already exist but are unused by the page:
  - `apps/web/src/features/buddies/api/buddies.ts`
  - `apps/web/src/features/buddies/hooks/queries.ts`
  - `apps/web/src/features/buddies/hooks/mutations.ts`
- Live Buddy Finder router currently exposes `GET /v1/buddy-finder/intents` publicly:
  - `services/fphgo/internal/features/buddyfinder/http/routes.go`
- Guest/member handling is merged in one list handler using `requireActorOrGuest`:
  - `services/fphgo/internal/features/buddyfinder/http/handlers.go`
- Member intent mapping currently returns full note and user/profile fields without guest-specific redaction:
  - `services/fphgo/internal/features/buddyfinder/http/dto.go`
  - `services/fphgo/internal/features/buddyfinder/http/handlers.go`
  - `services/fphgo/internal/features/buddyfinder/repo/queries/buddyfinder.sql`
- Public share preview is separately and more safely redacted than the main `/buddies` guest view:
  - `apps/web/src/app/buddy/[intentId]/page.tsx`
- There is an unfinished placeholder route under `/buddies/[id]` returning “Chika id”:
  - `apps/web/src/app/buddies/[id]/page.tsx`
- Current docs drift from live behavior:
  - `services/fphgo/docs/buddy-finder-v1.md`
  - `services/fphgo/docs/buddies-v1.md`
  - `services/fphgo/docs/buddies-visibility-v1.md`

## 7. Risks And Rollback

- Risk: changing Buddy Finder guest visibility can break current assumptions in `/buddies`, Explore buddy previews, or share surfaces if response contracts are not separated deliberately.
- Risk: wiring buddies relationship actions into the hub without tightening state modeling will create UI lies around request status and available actions.
- Risk: trying to “refresh the vibe” without fixing IA first will produce cosmetic nonsense over a broken workflow.
- Risk: there is already unrelated dirty worktree state; broad refactors can collide with user changes if not kept scoped.
- Rollback Notes:
  - If guest/member response split causes regressions, roll back the API contract split first and keep the hub rewrite behind the current member-only assumptions.
  - If the hub rewrite destabilizes the route, keep the old Buddy Finder flow functional while reverting only the new relationship-management sections.
  - Revert/remove the placeholder `/buddies/[id]` route only if replacement navigation is already in place; do not strand links.

## 8. Milestones

### Milestone 1: Product contract lock and IA rewrite
- Goal:
  - Define what `/buddies` is supposed to be, in code terms and user-facing terms, before touching implementation.
- Inputs/Dependencies:
  - `apps/web/src/app/buddies/page.tsx`
  - `services/fphgo/docs/buddy-finder-v1.md`
  - `services/fphgo/docs/buddies-v1.md`
  - `services/fphgo/docs/buddies-visibility-v1.md`
- Changes:
  - establish final section model for `/buddies`
  - decide guest-visible vs member-visible fields for Buddy Finder
  - define copy tone, labels, and success/error language
  - decide fate of `/buddies/[id]`
- Validation Commands:
  - none beyond repo review in this milestone
- Expected Evidence:
  - plan-approved IA with explicit guest/member field boundaries
  - wording map for hero, cards, actions, empty states, and success/error text
- Rollback Notes:
  - no code rollback needed; this milestone is design/spec lock
- Status: `done`

### Milestone 2: Backend privacy alignment for Buddy Finder reads
- Goal:
  - make live API behavior truthful and safe instead of relying on frontend copy to fake privacy.
- Inputs/Dependencies:
  - `services/fphgo/internal/features/buddyfinder/http/routes.go`
  - `services/fphgo/internal/features/buddyfinder/http/handlers.go`
  - `services/fphgo/internal/features/buddyfinder/http/dto.go`
  - `services/fphgo/internal/features/buddyfinder/repo/queries/buddyfinder.sql`
  - `packages/types/src/index.ts`
- Changes:
  - either split guest and member list responses, or reintroduce member gating for full intents
  - ensure guest payloads are redacted by server contract, not by UI convention
  - keep share-preview and site-preview semantics aligned with the chosen privacy model
  - update shared types if response shapes diverge
- Validation Commands:
  - `cd services/fphgo && go test ./internal/features/buddyfinder/...`
  - `pnpm --filter @freediving.ph/types test`
- Expected Evidence:
  - guest fetch cannot return fields deemed member-only
  - docs and route behavior no longer contradict each other
- Rollback Notes:
  - revert to the prior read contract if web migration is blocked, but document the leak explicitly
- Status: `done`

### Milestone 3: Web relationship-management foundation
- Goal:
  - surface the existing buddies system in the web app instead of pretending it does not exist.
- Inputs/Dependencies:
  - `apps/web/src/features/buddies/api/buddies.ts`
  - `apps/web/src/features/buddies/hooks/queries.ts`
  - `apps/web/src/features/buddies/hooks/mutations.ts`
  - `apps/web/src/app/buddies/page.tsx`
- Changes:
  - build sections/components for:
    - current buddies
    - incoming requests
    - outgoing requests
  - wire accept/decline/cancel/remove/send actions
  - show request state and sensible empty states
  - add request action entry points from relevant cards/profile references where appropriate
- Validation Commands:
  - `pnpm --filter @freediving.ph/web type-check`
  - `pnpm --filter @freediving.ph/web test`
- Expected Evidence:
  - signed-in users can exercise the actual buddy lifecycle from the UI
  - relationship queries/mutations are no longer dead code
- Rollback Notes:
  - revert section components independently if one state flow is unstable; do not tear out the entire route
- Status: `done`

### Milestone 4: Buddy Finder management and route cleanup
- Goal:
  - finish the missing operational pieces around Buddy Finder and remove obvious junk.
- Inputs/Dependencies:
  - `apps/web/src/app/buddies/page.tsx`
  - `apps/web/src/features/buddies/api/buddy-finder.ts`
  - `apps/web/src/app/buddies/[id]/page.tsx`
- Changes:
  - add “my active post(s)” handling or equivalent self-management view
  - wire delete intent for owned posts
  - make guest/member Buddy Finder card variants explicit
  - replace or remove the placeholder `/buddies/[id]` route
- Validation Commands:
  - `pnpm --filter @freediving.ph/web type-check`
  - `pnpm --filter @freediving.ph/web test`
- Expected Evidence:
  - users can manage their own active intents
  - no fake or placeholder buddies route remains
- Rollback Notes:
  - keep intent creation intact even if self-management UI must be reverted temporarily
- Status: `done`

### Milestone 5: Experience rewrite, copy pass, and visual polish
- Goal:
  - make the page feel like a serious product surface instead of a generic card stack with mismatched language.
- Inputs/Dependencies:
  - `apps/web/src/app/buddies/page.tsx`
  - shared UI primitives already used in `apps/web`
- Changes:
  - restructure the hero and section hierarchy around clarity:
    - “Your buddies”
    - “Requests”
    - “Find dive partners”
    - “Post availability”
  - replace vague or awkward copy:
    - remove “DM request preview sent”
    - remove fuzzy “match” phrasing where the product is really request-driven
    - use blunt, trustworthy privacy labels
  - improve visual rhythm, spacing, hierarchy, and state communication
  - align guest CTA language with actual restrictions
- Validation Commands:
  - `pnpm --filter @freediving.ph/web type-check`
  - targeted visual/manual review in dev
- Expected Evidence:
  - copy reads consistently across guest/member states
  - page hierarchy makes the primary actions obvious within one screen
- Rollback Notes:
  - visual/copy changes can be reverted independently if stakeholders disagree; keep functional fixes intact
- Status: `done`

### Milestone 6: Docs, cleanup, and verification
- Goal:
  - close the loop so the repo stops lying about buddies behavior.
- Inputs/Dependencies:
  - updated web and Go code from milestones 2-5
- Changes:
  - update Buddy Finder docs and buddies visibility docs
  - add/adjust targeted tests for guest/member visibility and route expectations
  - run narrow checks first, then broader checks if blast radius warrants it
- Validation Commands:
  - `cd services/fphgo && go test ./internal/features/buddyfinder/... ./internal/features/buddies/...`
  - `pnpm --filter @freediving.ph/types test`
  - `pnpm --filter @freediving.ph/web type-check`
  - `pnpm --filter @freediving.ph/web test`
- Expected Evidence:
  - docs match live code
  - targeted checks pass or remaining unrelated failures are explicitly recorded
- Rollback Notes:
  - revert docs only alongside reverted behavior; do not leave contract drift behind again
- Status: `done`

## 9. Verification Plan

- `cd services/fphgo && go test ./internal/features/buddyfinder/... ./internal/features/buddies/...`
- `pnpm --filter @freediving.ph/types test`
- `pnpm --filter @freediving.ph/web type-check`
- `pnpm --filter @freediving.ph/web test`
- If blast radius expands across shared routes or auth behavior:
  - `pnpm typecheck`
  - `pnpm lint`

## 10. Progress Log

- 2026-03-08: Audited `/buddies` and confirmed the route is a Buddy Finder page rather than a real buddies hub; the real buddies relationship API/hooks exist in web but are not wired into the route.
- 2026-03-08: Confirmed live backend drift: `GET /v1/buddy-finder/intents` is public in router code even though Buddy Finder docs still describe it as member-only.
- 2026-03-08: Confirmed privacy mismatch: guest-visible list cards can receive full note and identity fields from the Buddy Finder list path, while preview/share endpoints are server-redacted.
- 2026-03-08: Confirmed dead artifact: `apps/web/src/app/buddies/[id]/page.tsx` is placeholder junk unrelated to the actual buddies product.
- 2026-03-08: Locked full Buddy Finder intent reads back behind member auth, added `/v1/buddy-finder/intents/mine` for self-management, and updated the Buddy Finder docs to reflect the live contract.
- 2026-03-08: Rebuilt `apps/web/src/app/buddies/page.tsx` into a real buddies hub with current buddies, incoming/outgoing requests, active availability management, guest-safe preview, and corrected wording.
- 2026-03-08: Removed the stale `/buddies` middleware auth gate so the guest preview is reachable, redirected `/buddies/[id]` back to `/buddies`, and updated route/frontend contract coverage touched by the change.
- 2026-03-08: Verified `cd services/fphgo && go test ./internal/features/buddyfinder/... ./internal/features/buddies/...`, `pnpm --filter @freediving.ph/web type-check`, and `pnpm --filter @freediving.ph/web exec node --test test/fphgo-routes-contract.test.mjs`.
- 2026-03-08: Broader `pnpm --filter @freediving.ph/web test` still reports unrelated pre-existing failures in `best-addon-mvp1-contract.test.mjs`, `explore-buddy-site-contract.test.mjs`, `phase6-frontend-hardening-contract.test.mjs` (Chika expectation), and `fphgo-ci-smoke.test.mjs` without `FPHGO_BASE_URL`.

## 11. Outcomes And Follow-Ups

- Recommended implementation order:
  1. lock guest/member contract
  2. wire real buddies management
  3. finish Buddy Finder self-management
  4. rewrite page hierarchy and copy
- If product wants public discoverability, make that decision explicitly and design a guest-safe contract for it. Do not keep accidental public exposure and call it “privacy-first.”
- If product wants `/buddies` to remain primarily Buddy Finder, then rename the route/nav label accordingly. Right now the naming is misleading.

# ExecPlan: Groups Discovery And Group Detail Experience Rewrite

## 1. Title

Groups discovery cleanup, public/member flow alignment, and group detail rewrite

## 2. Objective

Turn `/groups` from a locked-down generic CRUD screen into a coherent public discovery page with a useful signed-in member flow, and upgrade `/groups/[id]` from a thin data dump into a real group detail surface.

## 3. Scope

- `apps/web` `/groups` list page information architecture, copy, and signed-in action flow.
- `apps/web` `/groups/[id]` detail page for overview, membership state, members, and post activity.
- `apps/web` groups feature hooks/API cleanup where auth gating or payload handling is currently wrong.
- `apps/web` route/middleware behavior so public groups remain reachable to guests.
- Targeted test updates for routes/contracts touched by the work.

## 4. Constraints And Non-Goals

- Do not touch `apps/api`; it is legacy.
- Do not invent moderation/admin tooling for groups in this pass.
- Keep backend changes minimal unless a real contract gap blocks the web flow.
- Non-goal: full group settings editor or scoped role-management UI.
- Non-goal: rich post composer, reactions, comments, or media attachments for groups in this milestone.

## 5. Acceptance Criteria

- `/groups` is publicly reachable and honestly reflects that public groups can be browsed without sign-in.
- Guests can browse public groups and open public group detail pages.
- Signed-in users can:
  - browse all visible groups
  - browse their joined groups
  - create a group
  - join or leave groups
  - understand approval/invite-only join states from the UI copy
- `/groups/[id]` clearly shows:
  - group overview
  - membership action state
  - member list
  - recent posts
  - a member-only post composer when allowed
- Wording no longer reads like generic SaaS boilerplate.
- The page hierarchy feels intentional and consistent with the upgraded `/buddies` surface.

## 6. Repo Evidence

- Current list page hard-locks `/groups` behind `AuthGuard` even though backend list/detail are public-capable:
  - `apps/web/src/app/groups/page.tsx`
  - `services/fphgo/internal/features/groups/http/routes.go`
  - `services/fphgo/internal/features/groups/http/handlers.go`
- Current detail page is a thin data dump with no meaningful interaction flow:
  - `apps/web/src/app/groups/[id]/page.tsx`
- Web groups feature already has usable hooks for list/detail/join/leave/create/post:
  - `apps/web/src/features/groups/api/groups.ts`
  - `apps/web/src/features/groups/hooks/queries.ts`
  - `apps/web/src/features/groups/hooks/mutations.ts`
- Backend service already distinguishes public vs member-only groups and approval/invite semantics:
  - `services/fphgo/internal/features/groups/service/service.go`
- Current shared types already cover the necessary list/detail/member/post payloads:
  - `packages/types/src/index.ts`

## 7. Risks And Rollback

- Risk: removing the frontend auth gate can expose poor guest-state assumptions in the existing hooks.
- Risk: join-state UI can lie if approval/invite-only semantics are not surfaced properly.
- Risk: broad visual rewrite can collide with unrelated existing work if edits are not scoped to groups files.
- Rollback Notes:
  - Revert list/detail page rewrites independently if one route regresses.
  - Keep the public list access change if it matches backend contract, even if the detail page needs partial rollback.

## 8. Milestones

### Milestone 1: Contract and IA lock
- Goal:
  - define the public/member model and page hierarchy for `/groups` and `/groups/[id]`
- Inputs/Dependencies:
  - `apps/web/src/app/groups/page.tsx`
  - `apps/web/src/app/groups/[id]/page.tsx`
  - `services/fphgo/internal/features/groups/service/service.go`
- Changes:
  - decide guest vs member sections
  - decide wording for public, approval, and invite-only states
  - define detail-page section model
- Validation Commands:
  - none beyond repo audit
- Expected Evidence:
  - explicit IA and state model
- Rollback Notes:
  - no code rollback; spec lock only
- Status: `done`

### Milestone 2: List page rewrite
- Goal:
  - make `/groups` publicly browseable and useful.
- Inputs/Dependencies:
  - `apps/web/src/app/groups/page.tsx`
  - `apps/web/src/features/groups/hooks/*`
  - `apps/web/src/middleware.ts`
- Changes:
  - remove auth-only lock on the page
  - add guest/member-aware tabs and CTAs
  - improve join/leave/create flows and empty states
  - rewrite copy and visual structure
- Validation Commands:
  - `pnpm --filter @freediving.ph/web type-check`
- Expected Evidence:
  - guests can browse public groups
  - members get correct "my groups" and action states
- Rollback Notes:
  - revert list page only if needed; do not reintroduce a false auth gate casually
- Status: `done`

### Milestone 3: Detail page rewrite
- Goal:
  - make `/groups/[id]` a usable destination instead of a raw dump.
- Inputs/Dependencies:
  - `apps/web/src/app/groups/[id]/page.tsx`
  - `apps/web/src/features/groups/hooks/*`
- Changes:
  - add group overview hero
  - add membership state and join/leave action handling
  - add member-only post composer
  - improve members/posts presentation and copy
- Validation Commands:
  - `pnpm --filter @freediving.ph/web type-check`
- Expected Evidence:
  - public groups render for guests
  - signed-in members can post and manage basic membership actions
- Rollback Notes:
  - revert detail page independently if interaction flow is unstable
- Status: `done`

### Milestone 4: Verification and cleanup
- Goal:
  - tighten route/test consistency for the groups changes.
- Inputs/Dependencies:
  - updated groups pages/hooks
- Changes:
  - update any affected middleware/route tests
  - run targeted checks
- Validation Commands:
  - `pnpm --filter @freediving.ph/web type-check`
  - targeted web tests for route/contracts touched by the change
- Expected Evidence:
  - no groups-specific type regressions
  - touched contract tests pass
- Rollback Notes:
  - revert only the groups-specific test updates if they overreach
- Status: `done`

## 9. Verification Plan

- `pnpm --filter @freediving.ph/web type-check`
- targeted `node --test` runs for any updated web contract files

## 10. Progress Log

- 2026-03-09: Audited `/groups` and confirmed the backend supports public list/detail reads while the frontend hard-locks the list page behind sign-in.
- 2026-03-09: Confirmed `/groups/[id]` exists but is only a thin client-side data dump with weak copy and minimal action flow.
- 2026-03-09: Confirmed current hooks already support list/detail/join/leave/create/post flows, so the main problem is UI/product wiring rather than missing backend endpoints.
- 2026-03-09: Rewrote `apps/web/src/app/groups/page.tsx` as a public-capable discovery page with guest/member-aware tabs, visibility filters, better join-state handling, and a proper create-group flow for signed-in users.
- 2026-03-09: Rewrote `apps/web/src/app/groups/[id]/page.tsx` into a real detail surface with overview, membership state, member list, recent posts, and a member-only post composer.
- 2026-03-09: Added query enable flags to the shared groups hooks where needed and verified `pnpm --filter @freediving.ph/web type-check`.

## 11. Outcomes And Follow-Ups

- Recommended implementation order:
  1. public/member list page rewrite
  2. detail page rewrite
  3. targeted test cleanup

- Existing raw uploader is already separated from domain logic and returns width/height: `services/fphgo/internal/features/media/http/handlers.go`, `services/fphgo/internal/features/media/service/service.go`, `services/fphgo/internal/features/media/http/dto.go`
- Current uploader persists loose `media_objects` only: `services/fphgo/db/migrations/0014_media_objects_v1.sql`, `services/fphgo/internal/features/media/repo/queries/media.sql`
- Current `/[username]/create` page is only a stub form with no publish backend: `apps/web/src/features/profile/pages/CreateProfilePostPage.tsx`, `apps/web/src/app/[username]/create/page.tsx`
- Current profile “posts” tab uses square-grid assumptions and static post DTOs, not masonry media items: `apps/web/src/features/profile/components/ProfileGrid.tsx`, `apps/web/src/features/profile/components/ProfileTabs.tsx`, `apps/web/src/features/profile/hooks/queries.ts`
- Public profile API currently exposes old `posts` endpoints without cursor pagination: `services/fphgo/internal/features/profiles/http/routes.go`, `services/fphgo/internal/features/profiles/http/handlers.go`, `services/fphgo/internal/features/profiles/service/service.go`
- Dive-site browse/search data already exists and is queryable from web: `services/fphgo/internal/features/explore/http/handlers.go`, `services/fphgo/internal/features/explore/http/dto.go`, `apps/web/src/features/diveSpots/api/explore-v1.ts`
- Shared web media API already talks to `fphgo` and can be extended instead of replaced: `apps/web/src/features/media/api/media.ts`, `apps/web/src/lib/api/fphgo-routes.ts`

## 7. Risks And Rollback

- Risk: profile media read path collides with the existing placeholder profile-post contract and UI.
- Risk: dirty worktree includes uncommitted create/profile changes, so broad rewrites could trample user work if not merged carefully.
- Risk: adding `react-photo-album` may require dependency installation if it is not already present.
- Risk: schema changes must preserve the current raw uploader and avoid orphaned domain references.
- Rollback Notes:
  - Keep raw uploader untouched so the system can fall back to loose uploads if the domain publish path regresses.
  - Isolate new DB tables and API endpoints so reverting the feature does not require undoing `media_objects`.
  - Replace the profile media tab in one component seam so UI rollback is limited to the new gallery/composer files.

## 8. Milestones

### Milestone 1: Contracts and schema foundation
- Goal:
  - Add migration(s), shared TS contracts, and feature SQL for `media_upload_groups`, `media_posts`, and `media_items`.
- Inputs/Dependencies:
  - `services/fphgo/db/migrations/0014_media_objects_v1.sql`
  - `services/fphgo/sqlc.yaml`
  - `packages/types/src/media.ts`
- Changes:
  - create new tables and indexes
  - extend `packages/types` with publish and profile-media contracts
  - add `sqlc` queries and repo mapping types for media post creation and profile-media listing
- Validation Commands:
  - `cd services/fphgo && make sqlc`
  - `pnpm --filter @freediving.ph/types test`
- Expected Evidence:
  - generated `sqlc` output includes new query types
  - shared types compile against the new request/response shapes
- Rollback Notes:
  - revert the new migration and generated files before any handler wiring if the model shape proves wrong
- Status: `pending`

### Milestone 2: Go publish and read APIs
- Goal:
  - Add authenticated create-media-post and paginated profile-media APIs on top of the new schema while reusing raw uploads.
- Inputs/Dependencies:
  - milestone 1 schema/contracts
  - existing uploader service/repo
  - existing explore repo for dive-site validation
- Changes:
  - add service rules for ownership, upload validation, file count/type/size guardrails, and video gating
  - add HTTP DTOs/routes/handlers for `POST /v1/media-posts` and paginated profile media reads
  - update profile or media feature read path to return independent media items with dive-site metadata and cursor pagination
- Validation Commands:
  - `cd services/fphgo && go test ./internal/features/media/... ./internal/features/profiles/...`
- Expected Evidence:
  - publish endpoint rejects malformed uploads and persists grouped posts/items for valid photo payloads
  - profile media endpoint returns width/height-backed items with next cursor
- Rollback Notes:
  - disable new route wiring and leave schema dormant if service behavior is unstable
- Status: `pending`

### Milestone 3: Web create composer
- Goal:
  - Replace the stub `/[username]/create` page with a real photo composer that uploads raw files, captures dive-site/caption metadata, and publishes grouped posts.
- Inputs/Dependencies:
  - milestone 2 APIs
  - existing auth/session patterns
  - existing explore list-sites API for dive-site selection
- Changes:
  - add media composer schema, hooks, uploader orchestration, preview carousel, caption apply-to-all behavior, and owner gating
  - keep upload state separate from publish mutation state
  - surface upload failures/retry or removal paths cleanly
- Validation Commands:
  - `pnpm --filter @freediving.ph/web type-check`
  - `pnpm --filter @freediving.ph/web test`
- Expected Evidence:
  - create page compiles against new API hooks and validates the required UX rules client-side
- Rollback Notes:
  - revert only the new create-page feature files while keeping backend endpoints available
- Status: `pending`

### Milestone 4: Profile masonry gallery
- Goal:
  - Replace the square profile grid with a masonry media gallery backed by paginated profile-media API data and a clean viewer hook.
- Inputs/Dependencies:
  - milestone 2 profile media endpoint
  - `react-photo-album`
- Changes:
  - integrate masonry layout with stored intrinsic dimensions
  - add pagination/infinite-load behavior and zero-state handling
  - preserve a clean tile click path for future grouped viewer/detail work
- Validation Commands:
  - `pnpm --filter @freediving.ph/web type-check`
  - `pnpm --filter @freediving.ph/web test`
- Expected Evidence:
  - profile tab renders independent items without aspect-ratio forcing and tolerates legacy items missing dimensions
- Rollback Notes:
  - swap the profile tab back to the current grid component if the masonry dependency or hydration behavior regresses
- Status: `pending`

## 9. Verification Plan

- `cd services/fphgo && make sqlc`
- `cd services/fphgo && go test ./internal/features/media/... ./internal/features/profiles/...`
- `pnpm --filter @freediving.ph/types test`
- `pnpm --filter @freediving.ph/web type-check`
- `pnpm --filter @freediving.ph/web test`

## 10. Progress Log

- 2026-03-08: Audited the existing raw uploader, profile endpoints, profile web UI, and dive-site source. Confirmed the uploader already returns width/height and should remain raw-asset only.
- 2026-03-08: Confirmed `/[username]/create` is currently a stub page in a dirty worktree and the public profile gallery still assumes square tiles, so this feature requires replacement rather than incremental hookup.
- 2026-03-08: Added `media_upload_groups`, `media_posts`, and `media_items`, updated schema/sqlc/shared types, and wired `services/fphgo` create/list endpoints on top of the existing raw uploader.
- 2026-03-08: Replaced the stub create page with a real RHF/Zod composer, added dive-site selection, per-photo captions, apply-to-all behavior, and upload/publish orchestration in `apps/web`.
- 2026-03-08: Replaced the profile square grid with a `react-photo-album` masonry gallery backed by the new paginated profile-media API and existing signed media URL minting flow.
- 2026-03-08: Verified `go test ./internal/features/media/... ./internal/features/profiles/...`, `pnpm --filter @freediving.ph/types test`, `pnpm --filter @freediving.ph/web type-check`, and a targeted web contract test for the new media flow. Full `pnpm --filter @freediving.ph/web test` still fails on unrelated pre-existing contract/smoke tests (`best-addon-mvp1-contract`, `explore-buddy-site-contract`, `fphgo-routes-contract`, `phase6-frontend-hardening-contract`, and missing `FPHGO_BASE_URL` for `fphgo-ci-smoke`).

## 11. Outcomes And Follow-Ups

- Implemented:
  - grouped media-post schema and publish/list APIs
  - `/[username]/create` photo composer with raw-upload reuse
  - profile masonry gallery with intrinsic dimensions and pagination
- Deferred:
  - video UI/upload flow
  - grouped viewer/sibling fetch endpoint
  - deeper recovery for stale or legacy media rows outside the new `media_items` model

# ExecPlan: Messaging Transactions Tab And Category Foundation

## 1. Title

Messaging `Transactions` tab rollout with backend category support

## 2. Objective

Replace `general` tab usage with `transactions` in the messaging v1 flow, add backend category support, and provide an explicit API to move thread inbox category between `primary` and `transactions` for service-flow integration.

## 3. Scope

- `services/fphgo` DB schema + migration + messaging service/http/repo category handling.
- `packages/types` messaging category contract update.
- `apps/web` messaging tab labels/categories, API calls, and badge counts.

## 4. Constraints And Non-Goals

- Do not modify `apps/api`.
- Non-goal: full service-transaction domain implementation (no existing `fphgo` service-booking backend yet).
- Keep backward safety where possible for existing data.

## 5. Acceptance Criteria

- Web shows `Primary`, `Transactions`, `Requests`; `General` removed from tab UI.
- `/v1/messages/threads?category=transactions` works.
- Existing `general` member categories are migrated to `transactions`.
- API includes explicit thread category update endpoint for `primary|transactions`.
- Targeted web/go checks pass.

## 6. Repo Evidence

- Messaging categories currently include `general`: `packages/types/src/index.ts`, `apps/web/src/features/messages/components/MessagingView.tsx`, `services/fphgo/internal/features/messaging/repo/repo.go`.
- DB enum currently has `('primary', 'general', 'requests')`: `services/fphgo/db/schema/000_schema.sql`, `services/fphgo/db/migrations/0021_messaging_threads_v1.sql`.
- Thread listing already filters by per-member `inbox_category`: `services/fphgo/internal/features/messaging/repo/queries/messaging.sql`.

## 7. Risks And Rollback

- Risk: category enum migration mismatch could break sqlc/query compilation.
- Risk: strict category validation can break old clients sending `general`.
- Rollback: revert migration + service/category validation changes + web type/tab changes together.

## 8. Milestones

### Milestone 1: Backend category foundation
- Goal: add `transactions` category in DB/schema/repo/service/http.
- Status: `done`

### Milestone 2: Web + shared contract rollout
- Goal: switch types and UI from `general` to `transactions`.
- Status: `done`

### Milestone 3: Verification
- Goal: run targeted checks and ensure no route/message regressions.
- Status: `done`

## 9. Verification Plan

- `cd services/fphgo && make sqlc`
- `cd services/fphgo && go test ./internal/features/messaging/...`
- `pnpm --filter @freediving.ph/web type-check`

## 10. Progress Log

- 2026-03-06: Planned implementation and validated current category usage and enum definitions across DB, backend, and web.
- 2026-03-06: Added DB migration `0022_messaging_transactions_category.sql` to introduce `transactions` inbox category and migrate existing `general` memberships.
- 2026-03-06: Updated messaging backend category handling (`ListThreads`, repo category mapping), added `POST /v1/messages/threads/{threadId}/category`, and broadcasted `thread.updated` on category change.
- 2026-03-06: Switched shared/web messaging category contracts and tabs from `general` to `transactions`; kept `general` as a backend alias for backward compatibility.
- 2026-03-06: Verified with `make sqlc`, `go test ./internal/features/messaging/...`, `pnpm --filter @freediving.ph/web type-check`, and `pnpm --filter @freediving.ph/types test`.

## 11. Outcomes And Follow-Ups

- Follow-up: service checkout/booking flow should call the new category endpoint (or a dedicated server-side workflow endpoint) to tag/open transaction-linked threads automatically.

- Implemented as planned. Follow-up only if you want broader browser-level interaction coverage with a dedicated component-test harness or Playwright auth fixture.

# ExecPlan: Messaging Threads E2E (Go + Web)

## 1. Title

Messaging threads v1 end-to-end across `services/fphgo` and `apps/web`

## 2. Objective

Replace the current request/conversation-centric messaging flow with a thread-centric v1 that supports category tabs (`primary`, `general`, `requests`), server-backed search, pagination, read state, and websocket realtime events, with responsive desktop/mobile UI at `/messages` and `/messages/[threadId]`.

## 3. Scope

- Add new messaging schema objects and indexes for thread/member/message modeling.
- Add sqlc query set and regenerate feature sqlc artifacts.
- Implement `services/fphgo` messaging repo/service/http endpoints for `/v1/messages/threads*` and mark-read.
- Extend websocket hub for targeted user fanout and wire messaging events (`message.created`, `thread.updated`, `thread.read`).
- Replace `apps/web` messaging client/hooks/components/pages with split desktop + mobile route-based UX.
- Update shared TS contracts in `packages/types` and route helpers in `apps/web/src/lib/api/fphgo-routes.ts`.
- Add implementation notes doc for schema/endpoints/events/deferred items.

## 4. Constraints And Non-Goals

- Do not touch `apps/api`.
- Keep handlers thin; business logic in services; repo DB-only.
- Use existing auth and validation (`httpx.DecodeAndValidate[T]`).
- No Redis/pubsub fanout; single-instance in-memory websocket hub only.
- Non-goal: group messaging, media/voice send, typing/reactions/replies/edit/delete, E2EE, push notifications.

## 5. Acceptance Criteria

- New migration is reversible and introduces thread/member/message structures required for v1.
- `GET /v1/messages/threads`, `GET /v1/messages/threads/{threadId}`, `GET /v1/messages/threads/{threadId}/messages`, `POST /v1/messages/threads/{threadId}/messages`, `POST /v1/messages/threads/direct`, and `POST /v1/messages/threads/{threadId}/read` are implemented and protected.
- Direct thread open/create reuses existing active pair thread.
- Conversation list/search/category filters are server-backed and paginated.
- Message send and read updates emit websocket events to thread-member users only.
- Web routes `/messages` and `/messages/[threadId]` implement responsive inbox/thread behavior and optimistic send reconciliation.
- No `dark:` classes are used in the new messaging UI.

## 6. Repo Evidence

- Existing messaging backend is request/conversation based: `services/fphgo/internal/features/messaging/{http,service,repo}`.
- Existing web messaging page is monolithic and not responsive split-pane: `apps/web/src/app/messages/page.tsx`.
- Existing WS hub broadcasts globally to all clients: `services/fphgo/internal/realtime/ws/hub.go`.
- Existing schema defines `conversations`, `conversation_participants`, `messages`: `services/fphgo/db/schema/000_schema.sql`.

## 7. Risks And Rollback

- Risk: breaking existing message tests/routes while introducing new thread routes.
- Risk: sqlc generation mismatch if query names/types are inconsistent.
- Risk: websocket change can unintentionally leak events to non-members.
- Rollback Notes:
  - Keep old routes untouched while adding thread routes in parallel.
  - Isolate new DB objects to `message_*` prefixed tables to avoid destructive schema churn.
  - Revert milestone-specific files only if a stage fails verification.

## 8. Milestones

### Milestone 1: Schema + query layer
- Goal: add message thread schema and sqlc query surface.
- Inputs/Dependencies:
  - `services/fphgo/db/migrations`
  - `services/fphgo/internal/features/messaging/repo/queries/messaging.sql`
  - `services/fphgo/sqlc.yaml`
- Changes:
  - add migration for `message_threads`, `message_thread_members`, `thread_messages` (+ enums/indexes)
  - add query set for list/search/detail/messages/send/read/direct-thread upsert
  - regenerate sqlc files
- Validation Commands:
  - `cd services/fphgo && make sqlc`
  - `cd services/fphgo && go test ./internal/features/messaging/repo/...`
- Expected Evidence:
  - generated sqlc code compiles with new repo interfaces
- Rollback Notes:
  - revert migration/query additions before service wiring if query surface is unstable
- Status: `done`

### Milestone 2: Go service/http/ws integration
- Goal: implement required `/threads` endpoints and targeted realtime delivery.
- Inputs/Dependencies:
  - milestone 1 query surface
  - `services/fphgo/internal/features/messaging/{repo,service,http}`
  - `services/fphgo/internal/realtime/ws`
- Changes:
  - add new DTOs and handler methods
  - enforce membership/authz and non-regressive read logic
  - add direct-thread open/create service path
  - add hub per-user fanout + messaging event payloads
- Validation Commands:
  - `cd services/fphgo && go test ./internal/features/messaging/... ./internal/realtime/ws ./internal/app`
- Expected Evidence:
  - thread endpoints available and tests covering core flows
- Rollback Notes:
  - preserve old endpoints; rollback only new handlers/service methods if needed
- Status: `done`

### Milestone 3: Web feature rewrite + responsive routing
- Goal: replace web messaging feature with URL-driven inbox/thread UX and realtime reconciliation.
- Inputs/Dependencies:
  - new API contracts/routes
  - `apps/web/src/features/messages`
  - `apps/web/src/app/messages/page.tsx` and new `[threadId]/page.tsx`
- Changes:
  - update messages API client and query keys for category/search/pagination
  - implement desktop split pane and mobile list/thread states
  - optimistic send with `clientId` reconciliation
  - mark-read on visible active thread
- Validation Commands:
  - `pnpm --filter @freediving.ph/web type-check`
  - `pnpm --filter @freediving.ph/web test`
- Expected Evidence:
  - routes render correctly with themed token classes and no `dark:` utilities
- Rollback Notes:
  - revert web-only messaging files if backend contract still in flux
- Status: `done`

### Milestone 4: Contracts/docs verification
- Goal: align shared TS contracts and add implementation notes.
- Inputs/Dependencies:
  - backend + web changes from prior milestones
  - `packages/types`
- Changes:
  - update/add messaging contracts and tests
  - add short implementation notes doc in `services/fphgo/docs`
- Validation Commands:
  - `pnpm --filter @freediving.ph/types test`
  - targeted combined checks from milestones 2-3
- Expected Evidence:
  - documented schema/endpoints/events/deferred items and passing contract tests
- Rollback Notes:
  - keep docs/contracts aligned with shipped behavior; revert incomplete drift
- Status: `done`

## 9. Verification Plan

- `cd services/fphgo && make sqlc`
- `cd services/fphgo && go test ./internal/features/messaging/... ./internal/realtime/ws ./internal/app`
- `pnpm --filter @freediving.ph/types test`
- `pnpm --filter @freediving.ph/web type-check`
- `pnpm --filter @freediving.ph/web test`

## 10. Progress Log

- 2026-03-06: Audited current messaging backend/web/ws and confirmed model/route mismatch against requested thread-based v1.
- 2026-03-06: Added migration `0021_messaging_threads_v1.sql`, updated schema snapshot, appended thread-based sqlc queries, regenerated sqlc, and implemented additive repo/service/http `/v1/messages/threads*` flows with targeted websocket fanout.
- 2026-03-06: Replaced web messaging page with route-driven responsive inbox/thread UI (`/messages`, `/messages/[threadId]`), server-backed tab/search/pagination queries, optimistic send via `clientId`, and read-mark behavior.
- 2026-03-06: Updated route snapshot for internal app routes, ran messaging/app Go tests and web/type package checks; did not run full `@freediving.ph/web` test suite in this pass.

## 11. Outcomes And Follow-Ups

- Pending implementation.

# ExecPlan: Chika Pseudonym Trust Hardening

## 1. Title

Chika long-term anonymity hardening (aliases, reveal gating, and moderation-safe response behavior)

## 2. Objective

Implement durable per-thread pseudonymous identity, reduce collision risk, enforce account-level pseudonymous controls, and prevent identity leakage from default list/detail endpoints while preserving moderator workflows.

## 3. Scope

- `services/fphgo` DB migration + schema snapshot updates for alias storage and mode constraints.
- `services/fphgo` config, authz, chika repo/service/http behavior.
- `apps/web` chika detail UX notice for automatic anonymous replies.
- chika/config/authz targeted tests.

## 4. Constraints And Non-Goals

- Do not modify legacy `apps/api`.
- Keep existing endpoint paths; avoid introducing breaking route changes in this pass.
- Non-goal: build a full standalone reveal-audit endpoint family in this pass.

## 5. Acceptance Criteria

- Thread/user alias mapping is persisted and reused (`chika_thread_aliases`).
- New pseudonyms use HMAC+secret-derived format and are collision-hardened via DB uniqueness.
- Pseudonymous posting is blocked for users with `profiles.pseudonymous_enabled = false`.
- Default thread/comment responses omit real author IDs; reveal requires explicit request + permission.
- Reveal attempts are rate-limited.
- Pseudonymous threads have stricter write/reaction limits than normal threads.
- Web thread detail explicitly states comments/replies are automatically pseudonymous.

## 6. Repo Evidence

- Existing pseudonym hash in service used SHA1 with short output: `services/fphgo/internal/features/chika/service/service.go`
- Existing real IDs exposed automatically for moderators in thread/comment responses: `services/fphgo/internal/features/chika/http/handlers.go`
- Existing schema lacked alias mapping table and allowed only `normal|pseudonymous` modes: `services/fphgo/db/schema/000_schema.sql`
- Existing web comment UI had no explicit per-thread anonymity reminder: `apps/web/src/app/chika/[id]/page.tsx`

## 7. Risks And Rollback

- Risk: response contract behavior change for moderators relying on `realAuthorUserId` in default payloads.
- Risk: rollout without `CHIKA_PSEUDONYM_SECRET` in production config blocks startup.
- Rollback Notes:
  - revert migration `0025_chika_aliases_and_mode_hardening.sql` and restore prior pseudonym generation logic if rollout blocks.
  - revert reveal gating changes in handlers if moderator UI integrations require immediate fallback.

## 8. Milestones

### Milestone 1: Data and config foundations
- Goal: add alias persistence table + mode hardening and runtime secret support.
- Inputs/Dependencies:
  - `services/fphgo/db/migrations`
  - `services/fphgo/db/schema/000_schema.sql`
  - `services/fphgo/internal/config/config.go`
- Changes:
  - add `chika_thread_aliases` table + uniqueness/index + backfill from existing rows
  - extend thread mode check to include `locked_pseudonymous`
  - add `CHIKA_PSEUDONYM_SECRET` config support/validation
- Validation Commands:
  - `cd services/fphgo && go test ./internal/config`
- Expected Evidence:
  - config tests include production guard for missing pseudonym secret
- Rollback Notes:
  - revert migration and config fields together to avoid mixed runtime/state
- Status: `done`

### Milestone 2: Repo + service pseudonym model
- Goal: move pseudonym generation to persisted alias model and enforce user setting.
- Inputs/Dependencies:
  - `services/fphgo/internal/features/chika/{repo,service}`
- Changes:
  - add repo alias methods (`GetThreadAlias`, `FindHistoricalThreadPseudonym`, `UpsertThreadAlias`)
  - generate pseudonyms using HMAC secret
  - resolve/store aliases per thread/user and hydrate pseudonymous thread author aliases
  - enforce `pseudonymous_enabled` for pseudonymous posting
  - tighten pseudonymous-thread write/reaction limits
- Validation Commands:
  - `cd services/fphgo && go test ./internal/features/chika/repo ./internal/features/chika/service`
- Expected Evidence:
  - service and repo tests pass with new interface methods and alias flow
- Rollback Notes:
  - revert service/repo changes together to keep interface surface consistent
- Status: `done`

### Milestone 3: HTTP leak prevention + UX signal
- Goal: stop default identity leakage while preserving controlled moderator reveal.
- Inputs/Dependencies:
  - `services/fphgo/internal/features/chika/http`
  - `services/fphgo/internal/shared/authz/authz.go`
  - `apps/web/src/app/chika/[id]/page.tsx`
- Changes:
  - add `chika.reveal_identity` permission in Go authz
  - only include `realAuthorUserId` when `includeRealAuthor=true` and actor has reveal permission
  - add per-request reveal rate-limit enforcement
  - add thread-level UI notice that comments/replies are auto-anonymous in anonymous threads
- Validation Commands:
  - `cd services/fphgo && go test ./internal/features/chika/http ./internal/shared/authz`
  - `pnpm --filter @freediving.ph/web type-check`
- Expected Evidence:
  - moderator IDs no longer appear by default in thread/comment payloads
- Rollback Notes:
  - revert handler gating + authz permission if moderation tooling depends on legacy default payloads
- Status: `done`

## 9. Verification Plan

- `cd services/fphgo && go test ./internal/features/chika/... ./internal/config ./internal/shared/authz`
- `pnpm --filter @freediving.ph/web type-check`

## 10. Progress Log

- 2026-03-07: Added migration `0025_chika_aliases_and_mode_hardening.sql` and schema snapshot updates for alias mapping + mode constraints.
- 2026-03-07: Added `CHIKA_PSEUDONYM_SECRET` config wiring and production guard; wired secret into chika service dependency construction.
- 2026-03-07: Replaced ad hoc short SHA1 pseudonyming with HMAC-based alias generation + persisted thread alias flow, added pseudonymous account-setting enforcement, and tightened pseudonymous-thread rate limits.
- 2026-03-07: Updated chika handlers to gate `realAuthorUserId` behind `includeRealAuthor=true` + `chika.reveal_identity` + reveal rate limit; updated related chika HTTP tests.
- 2026-03-07: Added anonymous-thread comment UX notice in web and updated pseudonym/rate-limit docs.

## 11. Outcomes And Follow-Ups

- Targeted backend tests pass: chika repo/service/http, config, authz.
- Web type-check passes.
- Known residual: `go test ./internal/app` route-snapshot assertion reports pre-existing route-count drift in local branch; not updated in this pass.

# ExecPlan: App-Wide Notifications V1 In FPHGO

## 1. Title

App-wide notifications foundation for `/notifications` using `services/fphgo`

## 2. Objective

Implement a canonical notifications backend in `services/fphgo` (schema, service, and HTTP routes), wire permissions/auth, and align `apps/web` notifications API calls to that backend.

## 3. Scope

- `services/fphgo` notifications feature (repo, service, http, routing, dependency wiring).
- `services/fphgo` DB migration + schema snapshot updates for notifications tables.
- `services/fphgo` authz permission additions for notification read/write.
- `apps/web` notifications API client path/contract alignment to `fphgo` v1 routes.

## 4. Constraints And Non-Goals

- Do not modify legacy `apps/api` for this implementation.
- Keep handlers thin; policy in service; DB access in repo.
- Non-goal: full async delivery pipeline (email/push workers) in this pass.
- Non-goal: websocket live notification fanout in this pass.

## 5. Acceptance Criteria

- `fphgo` exposes member-protected notification endpoints under `/v1/notifications` for:
  - list user notifications
  - read notification by id
  - mark one read
  - mark all read
  - delete notification
  - unread count
  - get/update settings
  - create notification (write-permission route)
- Authorization prevents users from reading/mutating other users' notifications.
- Notification list supports server-side filter inputs (`status`, `type`, `priority`) and pagination controls.
- Web `/notifications` page loads from `/v1/notifications` endpoints (not legacy `/notifications/*`).
- Targeted Go + web checks pass, or failures are explicitly documented.

## 6. Repo Evidence

- Current web notifications page and hooks exist: `apps/web/src/app/notifications/page.tsx`, `apps/web/src/features/notifications/*`.
- Current web notifications client points to legacy-style `/notifications/*`: `apps/web/src/features/notifications/api/notifications.ts`.
- `fphgo` currently has no notifications feature mounted in router: `services/fphgo/internal/app/routes.go`, `services/fphgo/internal/app/app.go`.
- Permission/middleware pattern to follow: `services/fphgo/internal/shared/authz/authz.go`, `services/fphgo/internal/middleware/clerk_auth.go`.
- Feature layering examples: `services/fphgo/internal/features/buddies/*`.

## 7. Risks And Rollback

- Risk: contract mismatch with existing frontend `ApiEnvelope` assumption.
- Risk: identity uses UUID in `fphgo`, while web types currently model numeric IDs for notifications.
- Risk: route surface changes may require snapshot/contract test updates.
- Rollback Notes:
  - revert notifications route mount + feature wiring if contract fallout is broad.
  - keep migration reversible and isolated so it can be rolled back independently.

## 8. Milestones

### Milestone 1: Backend notification domain in fphgo
- Goal: add notifications tables/migration and core repo/service/http endpoints.
- Inputs/Dependencies:
  - `services/fphgo/db/schema/000_schema.sql`
  - `services/fphgo/db/migrations/*`
  - `services/fphgo/internal/features/*`
- Changes:
  - add `notifications` and `notification_settings` tables + indexes
  - implement notifications repo/service/http and route mounting
  - enforce actor ownership in service for read/write ops
- Validation Commands:
  - `cd services/fphgo && go test ./internal/features/notifications/...`
- Expected Evidence:
  - notification handlers compile and return stable JSON responses
- Rollback Notes:
  - revert new feature folder and route mount together to avoid dangling dependencies
- Status: `done`

### Milestone 2: Authz and app wiring
- Goal: add explicit notification permissions and enforce via middleware.
- Inputs/Dependencies:
  - `services/fphgo/internal/shared/authz/authz.go`
  - `services/fphgo/internal/app/{app.go,routes.go}`
- Changes:
  - add `notifications.read` and `notifications.write`
  - include permissions in role grants
  - mount `/v1/notifications` under member + permission groups
- Validation Commands:
  - `cd services/fphgo && go test ./internal/shared/authz ./internal/app`
- Expected Evidence:
  - authz tests include new permission behavior
  - route tests include notifications paths and protection
- Rollback Notes:
  - revert authz additions together with route wiring if policy gating breaks clients
- Status: `done`

### Milestone 3: Web client contract alignment
- Goal: point web notifications client to `fphgo` route contract and stop client-side anti-patterns.
- Inputs/Dependencies:
  - `apps/web/src/features/notifications/api/notifications.ts`
- Changes:
  - switch API paths to `/v1/notifications/*`
  - use server-side filtering query params for list
  - fetch stats from dedicated endpoint instead of deriving from full list
- Validation Commands:
  - `pnpm --filter @freediving.ph/web type-check`
  - targeted notifications tests if present
- Expected Evidence:
  - `/notifications` page reads and mutates via `fphgo` endpoints only
- Rollback Notes:
  - revert only notifications API client file if frontend contract mismatch is found
- Status: `done`

## 9. Verification Plan

- `cd services/fphgo && go test ./internal/features/notifications/...`
- `cd services/fphgo && go test ./internal/shared/authz ./internal/app`
- `pnpm --filter @freediving.ph/web type-check`
- Optional broader check if targeted checks pass: `cd services/fphgo && go test ./...`

## 10. Progress Log

- 2026-03-07: Audited current web notifications implementation and confirmed it targets legacy-style endpoints and computes stats client-side.
- 2026-03-07: Confirmed no existing notifications feature in `services/fphgo`; implementation required from schema to routes.
- 2026-03-07: Added migration `0026_notifications_v1.sql` and schema snapshot updates for `notifications` + `notification_settings` tables and indexes.
- 2026-03-07: Implemented `services/fphgo/internal/features/notifications` (`repo`, `service`, `http`) with identity-scoped list/read/mark-read/mark-all/delete/settings/stats/unread-count endpoints.
- 2026-03-07: Added notification permissions in authz and mounted `/v1/notifications` in app router + dependency wiring.
- 2026-03-07: Updated web notifications client/hooks/components/page to call `/v1/notifications` and removed numeric-user-id gating from `/notifications`.
- 2026-03-07: Verified targeted checks: `go test ./internal/features/notifications/... ./internal/shared/authz ./internal/app`, `pnpm --filter @freediving.ph/web type-check`, and `pnpm --filter @freediving.ph/types test`.

## 11. Outcomes And Follow-Ups

- Implemented app-wide notifications foundation for `/notifications` on `fphgo` with identity-scoped routes and frontend alignment.
- Snapshot update executed for intentional route surface change (`UPDATE_SNAPSHOTS=1 go test ./internal/app -run TestRouteSurfaceSnapshot`).
- Non-goal remains open: async fanout workers (email/push) and websocket notification fanout.

# ExecPlan: Community Groups Domain With Group-Linked Events

## 1. Title

Community Groups v1/v2 in `services/fphgo` with first-class Group-Event linking

## 2. Objective

Ship a production-ready Groups domain (discovery, membership, moderation-safe posting, and media cover support) on `services/fphgo`, then extend Events so an event can optionally belong to a group with enforceable membership and organizer rules.

## 3. Scope

- `services/fphgo`: schema migrations, sqlc queries, repo/service/http, route mounts, authz integration, and integration tests.
- `packages/types`: canonical Group and Event DTO/contracts aligned with `fphgo`.
- `apps/web`: `/groups` and `/events` API clients/hooks/pages/components to consume `/v1/groups` and `/v1/events` contracts.
- Forward-compatible rollout from current legacy-shaped web contracts (`/groups`, `/events`, numeric IDs) to UUID + `/v1/*`.

## 4. Constraints And Non-Goals

- Do not modify `apps/api`; it is legacy.
- Do not ship dual write between `apps/api` and `services/fphgo`; `fphgo` is canonical for new API work.
- Keep handler layer thin and validated with `httpx.DecodeAndValidate[T]` conventions used in existing `fphgo` features.
- Non-goal for v1: recommendation/ranking engine for groups.
- Non-goal for v1: full event ticketing/payments.
- Non-goal for v1: deep threaded group post comments if core post stream is not yet stable.

## 5. Acceptance Criteria

- `services/fphgo` exposes a mounted `/v1/groups` router with:
  - list/search groups
  - group detail
  - create/update/archive group
  - join/leave/invite/approve membership flow (policy-driven by group type)
  - list members
  - list/create group posts
- `services/fphgo` exposes `/v1/events` router with:
  - list/detail/create/update/cancel events
  - attendee join/leave/list
  - optional `groupId` linkage with authorization checks.
- Group-linked event rules enforced:
  - private/invite group events are only visible/joinable by allowed members.
  - event organizer/staff permissions can derive from group ownership/moderator role where configured.
  - deleting/archiving a group does not orphan event integrity (explicit policy + migration constraints).
- `apps/web/src/app/groups/page.tsx` and events pages work against `/v1/*` endpoints and no longer rely on legacy response shapes.
- Shared types in `packages/types` match Go responses (UUID strings, status/type enums, pagination envelopes).
- Targeted Go + web checks pass for touched modules.

## 6. Repo Evidence

- Groups web page exists but is wired to legacy endpoints and wrong response shape assumptions:
  - `apps/web/src/app/groups/page.tsx`
  - `apps/web/src/features/groups/api/groups.ts`
- Events web feature also targets legacy `/events` paths:
  - `apps/web/src/features/events/api/events.ts`
  - `apps/web/src/app/events/page.tsx`
- Current `fphgo` router has no groups/events feature mounts:
  - `services/fphgo/internal/app/routes.go`
  - `services/fphgo/internal/app/app.go`
- `fphgo` currently only has foundational `groups` and `events` tables from RBAC bootstrap:
  - `services/fphgo/db/schema/000_schema.sql`
  - `services/fphgo/db/migrations/0002_platform_foundation_rbac.sql`
- Authz already defines group/event scoped permissions and scope logic:
  - `services/fphgo/internal/shared/authz/authz.go`
  - `services/fphgo/internal/features/identity/repo/repo.go`
- Feed already reads from minimal `events` + `event_memberships`, so event schema changes impact feed candidate queries:
  - `services/fphgo/internal/features/feed/repo/repo.go`

## 7. Risks And Rollback

- Risk: contract mismatch between web typed models (number IDs) and `fphgo` UUID reality can break pages silently.
- Risk: expanding `groups`/`events` tables may break feed query assumptions if defaults/backfills are missed.
- Risk: authorization leakage on group-linked events (private group event visible to non-members) is a security defect.
- Risk: migration order mistakes can break existing foreign keys or SQLC generation.
- Rollback Notes:
  - Keep migrations additive and reversible; isolate each milestone to one migration where possible.
  - Feature-flag web route adoption to `/v1/groups` and `/v1/events`; allow temporary UI fallback/disable.
  - If group-event linkage introduces critical issues, disable linkage in service policy while keeping base events operational.

## 8. Milestones

### Milestone 1: Canonical domain spec and contract lock
- Goal:
  - Freeze v1 domain rules for groups, memberships, posts, and event-link semantics before implementation.
- Inputs/Dependencies:
  - `packages/types/src/index.ts`
  - `services/fphgo/internal/shared/authz/authz.go`
  - current web pages in `apps/web/src/app/groups` and `apps/web/src/app/events`
- Changes:
  - define canonical enums/statuses and UUID-based DTOs for Group, GroupMember, GroupPost, Event, EventAttendee.
  - define pagination envelope standard and error code matrix.
  - define group-event policy matrix (public/private/invite/closed vs event visibility/join rules).
- Validation Commands:
  - design review checklist captured in plan progress log
- Expected Evidence:
  - one locked API contract section in this plan and updated type definitions in `packages/types`.
- Rollback Notes:
  - do not start DB/API coding until contract lock is accepted.
- Status: `pending`

### Milestone 2: DB schema expansion for groups/events
- Goal:
  - upgrade minimal RBAC tables into usable product tables without data loss.
- Inputs/Dependencies:
  - `services/fphgo/db/migrations`
  - `services/fphgo/db/schema/000_schema.sql`
- Changes:
  - add group fields: `slug`, `description`, `type`, `status`, `visibility`, `location`, counts, `created_by`.
  - add group membership metadata and role/status audit fields.
  - create `group_posts` (and optional `group_post_reactions` if required).
  - expand events fields and add nullable `group_id` FK + supporting indexes.
  - define deletion/archival behavior constraints for group-linked events.
- Validation Commands:
  - `cd services/fphgo && make migrate-up`
  - `cd services/fphgo && go test ./...`
- Expected Evidence:
  - migration applies cleanly on fresh and existing dev DB.
  - schema snapshot reflects new tables/columns/indexes/checks.
- Rollback Notes:
  - rollback by migration step; avoid mixing unrelated schema changes in same migration file.
- Status: `pending`

### Milestone 3: Groups feature in fphgo (repo/service/http/routes)
- Goal:
  - deliver `/v1/groups` backend with membership and posting.
- Inputs/Dependencies:
  - new group schema from Milestone 2
  - existing feature architecture patterns in `services/fphgo/internal/features/*`
- Changes:
  - create `internal/features/groups/{repo,service,http}`.
  - add sqlc queries for list/detail/membership/post flows.
  - enforce scoped permissions using existing authz + identity scope.
  - wire dependencies + mount route in `internal/app/app.go` and `internal/app/routes.go`.
  - add route contract tests and integration tests.
- Validation Commands:
  - `cd services/fphgo && make sqlc`
  - `cd services/fphgo && go test ./internal/features/groups/...`
  - `cd services/fphgo && go test ./internal/app`
- Expected Evidence:
  - `/v1/groups` endpoints appear in route surface tests and pass happy/negative auth cases.
- Rollback Notes:
  - remove mount + dependency wiring if feature needs temporary pullback.
- Status: `pending`

### Milestone 4: Events feature in fphgo with optional group linkage
- Goal:
  - deliver `/v1/events` and enforce group-aware event policies.
- Inputs/Dependencies:
  - schema updates from Milestone 2
  - groups service membership checks from Milestone 3
- Changes:
  - create `internal/features/events/{repo,service,http}`.
  - implement event CRUD + attendee flows.
  - implement group-linked policy checks (visibility, join eligibility, organizer/staff constraints).
  - add optional inherit-mode for moderators/owners to manage group events.
  - mount `/v1/events` routes.
- Validation Commands:
  - `cd services/fphgo && go test ./internal/features/events/...`
  - `cd services/fphgo && go test ./internal/app`
- Expected Evidence:
  - private group event access blocked for non-members.
  - public event behavior remains unchanged when `groupId` is null.
- Rollback Notes:
  - toggle off group-linked constraints by service switch if access bugs appear.
- Status: `pending`

### Milestone 5: Web migration to fphgo contracts (`/groups` + `/events`)
- Goal:
  - make `/groups` and `/events` pages actually functional against `fphgo`.
- Inputs/Dependencies:
  - `apps/web/src/features/groups/*`
  - `apps/web/src/features/events/*`
  - updated `packages/types`
- Changes:
  - repoint API clients to `/v1/groups` and `/v1/events`.
  - fix response shape handling and pagination extraction.
  - remove numeric-user-id assumptions where identity comes from authenticated context.
  - implement missing action wiring (join/leave/create/filter tabs/forms) with proper optimistic updates.
  - update pages/components to strict typing (remove `any`).
- Validation Commands:
  - `pnpm --filter @freediving.ph/web type-check`
  - `pnpm --filter @freediving.ph/web test`
- Expected Evidence:
  - `/groups` and `/events` UI can load, join/leave works, and error states are deterministic.
- Rollback Notes:
  - keep API client changes isolated to allow quick revert while retaining backend progress.
- Status: `pending`

### Milestone 6: Group-Event UX integration and admin controls
- Goal:
  - expose explicit event creation from group context and group event feeds.
- Inputs/Dependencies:
  - completed groups + events APIs
  - web routes/components for groups/events
- Changes:
  - add “Create Event in Group” flow with server-side guard.
  - add group detail sections: upcoming events, past events, pinned event.
  - add moderation/admin actions for group events (cancel, transfer organizer, close RSVP).
  - optional notification hooks for group members on event creation/update.
- Validation Commands:
  - `pnpm --filter @freediving.ph/web type-check`
  - targeted web tests for group-event flows
  - `cd services/fphgo && go test ./internal/features/groups/... ./internal/features/events/...`
- Expected Evidence:
  - group pages display linked events with role-aware actions.
- Rollback Notes:
  - disable advanced controls while preserving core link if regressions emerge.
- Status: `pending`

### Milestone 7: Hardening, observability, and launch gates
- Goal:
  - avoid shipping blind.
- Inputs/Dependencies:
  - all previous milestones
- Changes:
  - add structured logs/metrics around group/event write paths.
  - define abuse and moderation controls (rate limits, content/report hooks).
  - performance checks on list endpoints and membership joins.
  - update docs and runbook for incident response + rollback.
- Validation Commands:
  - `cd services/fphgo && go test ./...`
  - `pnpm typecheck && pnpm lint && pnpm test`
- Expected Evidence:
  - launch checklist complete with known limits and rollback tested.
- Rollback Notes:
  - defer GA; keep feature behind navigation/permission gate until SLO targets are met.
- Status: `pending`

## 9. Verification Plan

- Backend incremental:
  - `cd services/fphgo && make sqlc`
  - `cd services/fphgo && go test ./internal/features/groups/...`
  - `cd services/fphgo && go test ./internal/features/events/...`
  - `cd services/fphgo && go test ./internal/app`
- Frontend incremental:
  - `pnpm --filter @freediving.ph/types test`
  - `pnpm --filter @freediving.ph/web type-check`
  - `pnpm --filter @freediving.ph/web test`
- Release-level:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm test`

## 10. Progress Log

- 2026-03-07: Audited `/groups` and `/events` web modules; both target legacy-style endpoints and contracts.
- 2026-03-07: Confirmed no `groups` or `events` feature packages mounted in `services/fphgo/internal/features` and router wiring.
- 2026-03-07: Confirmed foundational schema/authz scope exists (`groups`, `events`, memberships, permission scopes), but product-grade domain implementation is absent.
- 2026-03-07: Drafted this execution plan with explicit group-event linkage milestones and rollback strategy.

## 11. Outcomes And Follow-Ups

- This plan intentionally sequences contract lock before DB/API coding to prevent repeating current contract drift.
- Immediate follow-up: approve or adjust the group-event policy matrix (especially private group event visibility and organizer inheritance) before Milestone 1 is marked done.

# ExecPlan: PSGC Canonical Location Backbone + Form APIs

## 1. Title

PSGC canonical location backbone for `services/fphgo` with form-ready location endpoints

## 2. Objective

Add a stable, versioned PSGC data model in `services/fphgo`, provide an import pipeline from `jobuntux/psgc` snapshots, and expose `/v1/locations` endpoints so event/location forms can bind against canonical region/province/city/barangay codes.

## 3. Scope

- `services/fphgo` DB migration and schema snapshot for PSGC tables + event location canonical fields.
- `services/fphgo` CLI import command for PSGC JSON snapshots.
- `services/fphgo` location feature (`repo/service/http`) and `/v1/locations` route mount.
- Event DTO/repo/service/http updates to accept and return canonical location fields.

## 4. Constraints And Non-Goals

- Do not modify `apps/api`.
- Keep runtime source of truth in local DB, not remote package API calls.
- Non-goal: web UI implementation in this pass.
- Non-goal: geocoding quality/scoring logic in this pass.

## 5. Acceptance Criteria

- Migration creates PSGC tables and event canonical location columns/indexes.
- Import command can load `regions.json`, `provinces.json`, `muncities.json`, `barangays.json` and write import history.
- API exposes `/v1/locations/regions`, `/provinces`, `/cities-municipalities`, `/barangays`.
- Event create/update/read supports canonical location payload fields and codes.
- Targeted Go tests pass for app route/snapshot and DB schema drift consistency.

## 6. Repo Evidence

- Event domain exists with free-text `location`: `services/fphgo/internal/features/events/*`, `services/fphgo/db/migrations/0027_groups_events_v1.sql`.
- No canonical PSGC feature/tables currently exist before this change.
- Router/dependency wiring pattern is centralized in `services/fphgo/internal/app/{app.go,routes.go}`.

## 7. Risks And Rollback

- Risk: FK/code mismatch during import can fail the full transaction.
- Risk: route surface change can break snapshot tests if not updated.
- Rollback:
  - Revert migration `0028_locations_psgc_v1.sql` and event field wiring together.
  - Disable `/v1/locations` mount by reverting `app.go/routes.go` if needed.

## 8. Milestones

### Milestone 1: Schema and migration
- Goal: Add PSGC schema + event canonical location fields/indexes.
- Status: `done`

### Milestone 2: Import pipeline
- Goal: Add deterministic JSON import command + import history writes.
- Status: `done`

### Milestone 3: Form APIs and event integration
- Goal: Add `/v1/locations` endpoints and event payload support for canonical codes.
- Status: `done`

### Milestone 4: Verification
- Goal: Run targeted checks (`go test ./internal/app ./db` and feature compile checks) and update snapshots if needed.
- Status: `done`

## 9. Verification Plan

- `cd services/fphgo && go test ./db ./internal/app ./internal/features/events/... ./internal/features/locations/...`
- If route snapshot drifts intentionally:
  - `cd services/fphgo && UPDATE_SNAPSHOTS=1 go test ./internal/app -run TestRouteSurfaceSnapshot`
  - rerun route tests without `UPDATE_SNAPSHOTS`.

## 10. Progress Log

- 2026-03-07: Confirmed `jobuntux/psgc` dataset format under `data/2025-2Q` is JSON files (`regions/provinces/muncities/barangays`).
- 2026-03-07: Added migration `0028_locations_psgc_v1.sql` and schema snapshot updates.
- 2026-03-07: Added `cmd/psgc-import` and `make psgc-import` target.
- 2026-03-07: Added `locations` feature endpoints and mounted `/v1/locations`.
- 2026-03-07: Extended events payload/repo/service to carry canonical location fields.
- 2026-03-07: Ran targeted verification (`go test ./db ./internal/app ./internal/features/events/... ./internal/features/locations/... ./cmd/psgc-import`) and updated route snapshot for `/v1/locations`.
- 2026-03-07: Downloaded PSGC `2025-2Q` source files into `services/fphgo/db/seeds/psgc/2025-2Q`, applied migrations through `0030`, and executed successful import run.

## 11. Outcomes And Follow-Ups

- Follow-up: wire web event/location forms to `/v1/locations` cascades and persist canonical codes + geocoding metadata.

## Events Discovery And Event Detail Rewrite
- Status: done
- Goal: turn /events into a public-capable discovery page with member actions, cleaner event creation, and a proper event detail experience that matches backend permissions.
- Scope:
  - remove the unnecessary auth wall on /events
  - rewrite events list page with guest/member states, better copy, filtering, and create flow
  - rebuild /events/[id] with structured event overview, join/leave handling, attendee visibility, and permission-aware messaging
  - update any event hooks needed to support conditional fetching cleanly
- Risks:
  - non-public event detail must not promise access the backend will reject
  - organizer leave behavior is blocked server-side and needs explicit UI copy
- Verification:
  - pnpm --filter @freediving.ph/web type-check
- Progress Log:
  - 2026-03-09: Rebuilt `/events` into a public-capable discovery page with guest/member states, stronger copy, better filtering, and a fuller publish-event flow.
  - 2026-03-09: Rebuilt `/events/[id]` into a structured detail page with permission-aware attendance messaging and attendee rendering.
  - 2026-03-09: Added optional `enabled` flags to event queries and verified with `pnpm --filter @freediving.ph/web type-check`.
