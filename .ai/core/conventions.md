# Conventions

## Commands

- Install: `pnpm install`
- Dev: `pnpm dev`
- Build: `pnpm build`
- Type-check: `pnpm typecheck`
- Lint: `pnpm lint`
- Test: `pnpm test`
- Full preflight: `pnpm preflight`

## Workspace Targeting

- Directory form: `pnpm -C <dir> <script>`
- Filter form: `pnpm --filter <package-name> <script>`

Known examples:

- `pnpm -C apps/web build`
- `pnpm --filter @freediving.ph/web type-check`
- `pnpm --filter @freediving.ph/types test`

## Coding Conventions

- TypeScript workspaces use the shared `tsconfig.base.json`.
- Formatting and linting use Biome.
- Web UI should prefer existing shadcn/ui composition patterns before custom Tailwind-heavy markup.
- Go service work should stay in `services/fphgo` and use existing package boundaries.
- Keep edits scoped to the active initiative phase.
- Do not revert unrelated dirty worktree changes.
