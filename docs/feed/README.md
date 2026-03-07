# Homepage Mixed Feed: Priority-Driven Plan

## Objective
Ship a server-driven homepage feed that answers: "What matters in freediving around me right now?"

## Non-Negotiables
- The feed is assembled in `services/fphgo`, not in `apps/web`.
- Homepage depends on `GET /v1/feed/home` as the primary data source.
- v1 ranking is rule-based; do not jump to ML.
- Impression and action telemetry ships with v1.
- `apps/api` is legacy and out of scope.

## Priority Order (Implementation)
1. **P0: Contract Lock + Source Audit**
2. **P1: Backend Feed Foundation (`fphgo`)**
3. **P2: Web Homepage Integration (`apps/web`)**
4. **P3: Personalization + Quality Tuning**
5. **P4: Production Hardening + Cold Start Defenses**

## Deliverables In This Folder
- `implementation-priorities.md`: execution order, tasks, and exit criteria by priority.
- `contracts-and-ranking.md`: API contracts, item union, scoring, merge, telemetry, and schema.

## Scope Guardrails
- Homepage is a **product surface backed by a feed engine**, not a frontend card mixer.
- Keep detailed domain workflows in their own feature flows:
  - deep spot exploration
  - buddy search/management
  - event management
- Homepage should surface and route, not absorb every workflow.

## Recommended MVP Cut
Include:
- modes: `following`, `nearby`, `training`, `spot-reports`
- entity types: post, community hot post, dive spot, event, buddy signal
- rule-based ranking + diversity re-rank
- infinite cursor pagination
- impressions + actions
- hide/block suppression

Defer:
- ML ranking
- embeddings/collaborative filtering
- precomputed fanout systems
- push systems coupled to feed behavior
