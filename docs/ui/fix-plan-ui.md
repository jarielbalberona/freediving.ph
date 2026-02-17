# UI Fix Plan (PR-sized)

## Strategy
Stop patching colors in components. Stabilize the token contract first, then migrate components in batches.

## Phase 1: Normalize Tailwind v4 entry + token file
Goal: one canonical Tailwind/token entrypoint with explicit semantic mapping contract.

### Files to change
- `apps/web/src/app/globals.css`
- `apps/web/src/app/layout.tsx` (optional small change if adding `data-theme` bridge)
- `apps/web/src/components/theme-provider.tsx` (if enabling attribute migration)
- `apps/web/components.json` (only if path/strategy changes; currently fine)
- `docs/ui/tailwind-v4-setup.md` (done in this audit)

### Exact changes
1. Keep `apps/web/src/app/globals.css` as single source of truth.
2. Refactor base CSS vars from generic names to namespaced semantic vars (`--ui-*`) and keep one top-level `@theme` block.
3. Add dual dark selectors to support migration safety:

```css
[data-theme="dark"],
.dark {
  /* dark variable overrides */
}
```

4. Keep `@import "tailwindcss";` at top and plugin directives immediately after.
5. Add explicit token comments/taxonomy sections in CSS for maintainability.

### Acceptance criteria
- Exactly one Tailwind entry CSS file with `@import "tailwindcss";` and top-level `@theme`.
- No duplicate token definition file.
- Dark mode variables are defined centrally and consumed via semantic utilities.

### Tests
- `pnpm --filter @freediving.ph/web type-check`
- `pnpm --filter @freediving.ph/web lint`
- `pnpm --filter @freediving.ph/web build`

### Visual QA checklist
- Light/dark switch still updates body background/foreground.
- Buttons, Cards, Inputs render unchanged or intentionally improved.
- No flash of incorrect theme on first paint.

## Phase 2: Implement semantic status tokens and dark mode cleanup
Goal: eliminate ad hoc status color literals.

### Files to change
- `apps/web/src/app/globals.css`
- `apps/web/src/features/diveSpots/components/DiveSpotCard.tsx`
- `apps/web/src/features/events/components/EventCard.tsx`
- `apps/web/src/features/user/components/UserCard.tsx`
- `apps/web/src/features/userServices/components/ServiceCard.tsx`
- `apps/web/src/features/notifications/components/NotificationCard.tsx`

### Exact changes
1. Add semantic status tokens in `@theme` (`success`, `warning`, `info` + foregrounds).
2. Replace all `bg-green-100 text-green-800`-style mappings with semantic utilities.
3. Replace unread notification hard-coded blue state with tokenized classes.

### Acceptance criteria
- No status badge logic returns raw palette utility strings.
- Notification unread/read colors are token-based.

### Tests
- Existing web checks plus snapshot/manual checks for each card variant.

### Visual QA checklist
- Difficulty/status badges are distinct in both light/dark.
- Notification state remains visually obvious and accessible.

## Phase 3: Migrate core components and high-traffic pages
Goal: remove class-soup from app-level pages and align with primitives.

### Files to change (first batch)
- `apps/web/src/app/profile/settings/page.tsx`
- `apps/web/src/features/chika/components/CreateThreadModal.tsx`
- `apps/web/src/features/chika/components/ThreadCard.tsx`
- `apps/web/src/features/chika/components/ThreadDetail.tsx`
- `apps/web/src/app/auth/form.tsx`

### Exact changes
1. Replace native form elements with shared primitives where practical.
2. Replace raw `gray/zinc/blue` classes with semantic token classes.
3. Remove `dark:*` color pairs where semantic classes already cover state.

### Acceptance criteria
- These files no longer contain palette classes (`gray-*`, `zinc-*`, etc.) except documented brand exceptions.
- Shared primitives are used consistently.

### Tests
- Form interactions, modals, buttons, inputs, toasts in both themes.

### Visual QA checklist
- Profile settings matches global theme naturally.
- Chika modal/detail cards look coherent with rest of app.
- Auth social buttons remain visually recognizable.

## Phase 4: App-wide sweep + legacy cleanup
Goal: reach 90%+ semantic token usage for color styling.

### Files to touch
- Remaining `apps/web/src/**` offenders from scan.

### Exact changes
1. Run regex sweep for raw palette and `dark:` class-pairs.
2. Apply safe replacements, then manual pass for edge cases.
3. Remove dead token aliases/legacy utility patterns.

### Acceptance criteria
- 90%+ of color styling uses semantic tokens.
- No new raw color classes introduced in changed files.

### Tests
- Full web build and smoke test key routes.
- Optional visual regression if tooling exists.

### Visual QA checklist
- Theme switch consistency across all top-level routes.
- Contrast checks for text on primary/muted/accent/destructive surfaces.

## Proposed Phase 1 PR (exact files and changes)

PR title: `web: normalize tailwind v4 token entrypoint`

### Files
- `apps/web/src/app/globals.css`
  - Keep as sole Tailwind entrypoint.
  - Rename base vars to `--ui-*` semantic namespace.
  - Add `[data-theme="dark"], .dark` dark selector.
  - Keep single top-level `@theme` mapping block to `--color-*`, `--font-*`, `--radius-*`, `--shadow-*`.
- `apps/web/src/components/theme-provider.tsx`
  - Optional: set `attribute="class"` remains, but prepare for `data-theme` by allowing attribute override.
- `apps/web/src/app/layout.tsx`
  - Optional: if moving to data-theme, update provider config and toggle code accordingly.

### Out-of-scope for Phase 1
- No mass component migration yet.
- No visual restyle experiments.

### Risk
- Low functional risk.
- Medium visual risk if variable names are changed without complete `@theme` remap.

### Rollback
- Single-file rollback mostly in `apps/web/src/app/globals.css`.
