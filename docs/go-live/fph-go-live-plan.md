# Freediving Philippines Go-Live Plan

## Blunt Position

Do not launch this as-is.

The backend is further along than the frontend truth, but the public product promise is still dishonest in a few places:

- Explore looks real but the main list/map is still mock-backed.
- Competitive Records exists in navigation and UI but is not implemented in the canonical backend.
- Messaging claims request behavior, but recipient request resolution is not complete in the web app.
- Backend verification is not green.

That is enough to block a public launch.

## Smallest Believable Go-Live Scope

If this product launches soon, the smallest believable scope is:

- Clerk sign-in and current-user bootstrap
- Username profile routes
- Profile edit + avatar upload
- Profile photo publishing + masonry gallery
- Chika thread list/detail/create/comment/reaction
- Messaging threads with basic send/read/realtime
- Buddy relationships
- Buddy Finder browse/post/contact
- Explore dive sites with a real `fphgo`-backed list/detail flow
- Groups and Events only if their restricted-access stories are either finished or explicitly narrowed

Out of that list, Explore is still not in shape, and Competitive Records should be removed from launch scope unless it gets a real backend.

## What Must Be Done Before Public Go-Live

### 1. Fix platform truth first

- Make repo verification green.
- Stop carrying stale test snapshots and failing feed assertions.
- Align documented commands with actual scripts (`type-check` vs `typecheck`).

### 2. Replace fake Explore with real Explore

- Main `/explore` must use `fphgo` site APIs, not mock data.
- Fix the id/slug route contract.
- Replace local-only “save” behavior with actual backend-backed saved-site behavior where intended.

### 3. Finish one honest messaging request flow

- If first-time conversations are request-gated, the recipient must be able to accept or decline them in the actual inbox UI.
- If not, remove the claim and simplify the behavior.

### 4. Stop shipping fake or legacy surfaces

- Remove or hide Competitive Records from launch scope unless it is implemented in `fphgo`.
- Hide or explicitly defer placeholder profile tabs that are not real.
- Remove dead sample files and stale docs that misrepresent current architecture.

### 5. Enforce launch safety around storage and config

- Validate R2/media/signing config in a real prelaunch smoke path.
- Confirm avatar upload, profile media upload, URL minting, and readback actually work in the target environment.

### 6. Narrow or finish restricted community flows

- Groups: either finish approval/invite-only management or launch only the subset that is honestly supported.
- Events: verify create/detail/join flows against real permissions and visibility rules.

## What Can Ship Later

- Competitive Records, if removed from launch scope
- Profile videos tab
- Profile saved/tagged tabs
- Explore polish beyond the core real map/list/detail flow
- Deeper moderation tooling
- Metrics/tracing beyond structured logs and request IDs
- Advanced groups/event moderation and admin controls

## Recommended Execution Order

1. Platform truth and verification repair
2. Explore real-data cutover and route-contract cleanup
3. Messaging request-resolution completion
4. Launch-scope cleanup: remove fake/placeholder surfaces
5. Storage/media readiness hardening
6. Groups/events restricted-flow hardening
7. Final smoke verification and release checklist

That order is not negotiable if the goal is an honest launch. Fixing fake surfaces after launch is the sort of lazy sequencing that burns trust.

## Suggested Milestones

### Milestone 1: Release truth and verification discipline

- Fix backend failing tests.
- Fix command/documentation mismatches.
- Freeze the launch checklist against actual scripts and actual routes.

### Milestone 2: Explore and Buddy differentiator

- Cut `/explore` over to `fphgo`.
- Fix slug/id mismatches.
- Verify site detail, buddy preview, and buddy fallback behavior end to end.

### Milestone 3: Profiles, media, and messaging completion

- Verify avatar upload and profile media publishing in target env.
- Add recipient-side message request resolution in web.
- Remove fake profile tabs from launch scope.

### Milestone 4: Community launch hardening

- Narrow or finish group restricted-membership behavior.
- Verify event visibility and join rules.
- Confirm Chika moderation/reporting basics are staffed and usable.

### Milestone 5: Final launch gate pass

- Smoke critical flows.
- Verify env and storage.
- Confirm no fake or dead launch routes remain in navigation.

## Explicit Go-Live Gates

### Gate A. Minimum Functional Product

Required before go-live:

- User can sign in with Clerk.
- Current user resolves to a local app identity.
- `/{username}` profile loads.
- Profile edit and avatar upload work.
- Profile media create and read flows work.
- Chika list/detail/create/comment works.
- Messaging thread open/send/read works.
- Buddy request and Buddy Finder core flow works.
- Explore list/detail uses real backend data.
- No obviously fake main navigation route pretends to be launch-ready.

Allowed post-launch:

- Profile videos
- Tagged and saved profile tabs
- Advanced group/event admin UX

Deferred debt:

- Competitive Records, unless fully implemented

### Gate B. Launch Safety

Required before go-live:

- Core validation is present on write paths.
- Message-request behavior is either complete or explicitly simplified.
- Storage failures are handled predictably.
- No fatal auth inconsistencies remain in main user flows.
- Privacy defaults are sane for Chika, buddy previews, groups, and events.
- Broken route contracts are fixed.

Allowed post-launch:

- Richer moderation dashboards
- More granular abuse instrumentation

Deferred debt:

- Deep analytics and experimentation infrastructure

### Gate C. Operational Readiness

Required before go-live:

- Required env vars are documented and correct.
- Migration path is clear.
- Render deployment assumptions are accurate.
- Health/readiness behavior is understood.
- Basic smoke verification exists for auth, media, messaging, explore, and primary community routes.
- Logs and errors are observable enough to debug production failures.

Allowed post-launch:

- Metrics/tracing expansion
- More advanced rollout tooling

Deferred debt:

- Full production-grade observability stack

## Release Risk Notes

- The current biggest product risk is false confidence from half-real surfaces.
- The current biggest engineering risk is uneven contract discipline across the web app.
- The current biggest operational risk is media/storage misconfiguration showing up only when a user tries to upload.
- The current biggest trust risk is launching Explore before replacing the mock path.

## What Should Not Be Touched Yet

- Do not start broad redesign work.
- Do not add new nice-to-have community features before Explore truth and verification are fixed.
- Do not build Competitive Records unless it is explicitly brought into launch scope with a real backend.

## First Truly Shippable Milestone

The first believable milestone is:

**Release truth + real Explore cutover**

That means:

- backend tests green
- route/test/documentation truth cleaned up
- main Explore path using `fphgo`
- id/slug mismatch removed

Until that exists, the product still fails the honesty test.
