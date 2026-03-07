# AGENTS.md (apps/web)

## Responsibility
`apps/web` owns the Next.js App Router frontend, page routes, UI composition, and client/server data-access integration.

## Structure And Where To Add Changes
- Pages/routes/layouts: `src/app/` (App Router)
- Reusable UI primitives/components: `src/components/` and `src/components/ui/`
- Feature-level hooks/components/api modules: `src/features/`
- Shared feature contracts/types: `packages/types/src` (consume in web via `@freediving.ph/types`)
- API/http client code: `src/lib/http/` (preferred) and `src/lib/`
- Shared hooks/providers/state:
  - Hooks: `src/hooks/`
  - Providers: `src/providers/`
  - Store: `src/store/`
- App/site config: `src/config/`

## UI Implementation Rules
- Use shadcn/ui components first when implementing UI.
- Avoid manual Tailwind utility markup as much as possible; add custom Tailwind classes only when shadcn/ui does not cover the requirement.
- When custom Tailwind is necessary, keep it minimal and consistent with existing code style.
- Follow existing file structure and code conventions for every UI change.

## Local Commands (Verified)
- `pnpm -C apps/web dev`
- `pnpm -C apps/web build`
- `pnpm -C apps/web lint`
- `pnpm -C apps/web type-check`
- `pnpm -C apps/web test`

## Visible Footguns
- `src/lib/api.ts` is marked legacy; prefer new integrations via `src/lib/http/*` for new work.
- `next dev --turbopack` is used in `dev`; verify behavior parity with production `next build` for non-trivial changes.
- Do not add `src/features/*/types.ts`; put API/shared contracts in `packages/types/src` and import from `@freediving.ph/types`.
