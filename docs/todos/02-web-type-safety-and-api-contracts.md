# 02 Web Type Safety and API Contracts

Status: Completed (web type-check clean)

## Issues

- `apps/web` has widespread TypeScript failures across `chika`, `notifications`, `media`, `user`, `userServices`, and `diveSpots`.
- API client and component layers are inconsistent about return shapes (Axios response vs domain payload).
- Some hooks/components use placeholder or missing functionality while still wired into production pages.
- Clerk token usage is implemented with invalid import patterns in client HTTP helpers.
- Frontend endpoints for some features do not match API routes (notably thread reactions).

## Fix

- Define one API response handling rule and enforce it:
  - API wrappers return domain payloads only, or
  - callers must always read `AxiosResponse` explicitly.
- Update all hooks/components to match the chosen response rule.
- Replace placeholder hook implementations with real API-backed logic or isolate as explicit TODO-only stubs not used in production.
- Fix Clerk auth token integration using supported Clerk APIs for client and server contexts.
- Align web endpoints with actual API route definitions.
- Add strict type coverage for high-traffic features first:
  - threads/chika
  - notifications
  - media
  - user/services

## Expectations

- `pnpm --filter @freediving.ph/web type-check` passes with zero errors.
- Feature hooks and UI components compile and agree on data contracts.
- No runtime shape guessing like `data?.data?.x` unless contract explicitly requires it.
- Auth token injection works without type hacks or invalid imports.
