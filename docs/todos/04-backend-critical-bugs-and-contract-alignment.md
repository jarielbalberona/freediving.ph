# 04 Backend Critical Bugs and Contract Alignment

Status: Completed (critical query predicates fixed)

## Issues

- Thread reactions logic uses JavaScript boolean operators in Drizzle `.where(...)` predicates, which can produce incorrect SQL behavior.
- Thread reaction route contract differs from frontend expectations (`/reactions` vs `/like` style).
- Route/controller response contracts are not consistently represented in shared DTOs.
- Potential runtime mismatch risk where backend returns nested objects but frontend assumes flat models.

## Fix

- Correct Drizzle query composition for reaction operations using proper SQL combinators.
- Decide and standardize one reaction API contract:
  - REST resource style (`/threads/:id/reactions`) preferred.
- Update frontend API clients/hooks to match backend routes after contract decision.
- Add focused tests for:
  - add reaction (new)
  - update existing reaction
  - remove reaction
  - aggregate counts (upvotes/downvotes)
- Document thread/comment/reaction response shapes in shared types.

## Expectations

- Reaction logic is deterministic and correct for both create/update/delete flows.
- Web and API agree on route paths and payloads.
- Thread detail and list views reflect accurate counts.
- Contract changes are codified and tested, not implicit.
