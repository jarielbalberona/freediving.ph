# 03 Shared Types Package Adoption

Status: Completed (shared API envelope types adopted)

## Issues

- Shared packages (`packages/types`, `packages/db`, `packages/ui`) are mostly scaffolds and not yet leveraged as the contract source of truth.
- Web and API define overlapping interfaces independently, causing drift.
- Feature-level types are duplicated and evolve out of sync with backend response models.
- Type contracts are not versioned or centrally governed for cross-workspace reuse.

## Fix

- Establish `@freediving.ph/types` as the canonical location for:
  - API DTOs (request/response)
  - shared domain models used by both web and API
  - paginated response envelopes and common metadata types
- Move duplicated feature types into shared package incrementally by domain:
  - threads
  - notifications
  - media
  - dive spots
  - user services
- Update imports in web/api to consume shared types.
- Keep backend persistence models separate from public API DTO types to avoid leaking internal fields.
- Add lightweight type governance:
  - naming conventions
  - where to define a new contract
  - compatibility policy when changing DTOs

## Expectations

- Cross-app contracts are declared once and reused.
- Web/API type drift is significantly reduced.
- PRs that change API response shape include corresponding shared type updates.
- Shared type package has real ownership and measurable usage.
