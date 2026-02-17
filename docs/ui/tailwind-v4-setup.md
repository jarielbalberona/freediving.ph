# Tailwind v4 Setup Audit (Freediving.ph)

## Verdict
Tailwind is already on v4 and compiling, but the design system is only half-finished. The token pipeline exists in CSS, while many feature components still bypass it with hard-coded palette classes.

## Current state with evidence

### 1) Version and build tool
- Build tool is Next.js App Router.
  - Evidence: `apps/web/package.json` uses `next` `15.5.4` and scripts run `next dev --turbopack` / `next build`.
- Tailwind is v4 in workspace deps and lockfile.
  - Evidence: `apps/web/package.json` has `"tailwindcss": "^4.1.14"` and `"@tailwindcss/postcss": "^4.0.8"`.
  - Evidence: `pnpm-lock.yaml:3399` has `tailwindcss@4.1.18`.
- Tailwind plugin integration is v4-style PostCSS plugin.
  - Evidence: `apps/web/postcss.config.mjs`:

```js
plugins: {
  "@tailwindcss/postcss": {},
}
```

### 2) Tailwind CSS entrypoint and import chain
- Tailwind entry CSS is `apps/web/src/app/globals.css`.
  - Evidence: `apps/web/src/app/layout.tsx:19` imports `"./globals.css"`.
  - Evidence: `apps/web/src/app/globals.css:1` has `@import "tailwindcss";`.
- `tailwindcss-animate` plugin is loaded via CSS.
  - Evidence: `apps/web/src/app/globals.css:3` has `@plugin "tailwindcss-animate";`.

### 3) v3 legacy config artifacts
- No `tailwind.config.*` exists in repo.
  - Evidence: only `apps/web/postcss.config.mjs` was found.
- `components.json` (shadcn) is already aligned for CSS-variable mode and points at global CSS.
  - Evidence: `apps/web/components.json:8` -> `"css": "src/app/globals.css"`, `:10` -> `"cssVariables": true`.

### 4) Sass/Less compatibility risk check
- No `.scss`, `.sass`, or `.less` files found in workspace.
- No Sass pipeline currently active.
- `pnpm-lock.yaml` contains optional `sass` from transitive deps, but no project-level Sass usage.

Risk rating: **Low** for build compatibility, **High** for design-system consistency drift.

## Token system status

### What is correct
- Semantic variables exist and are mapped to Tailwind color namespaces through `@theme inline`.
  - Evidence: `apps/web/src/app/globals.css:118-150` maps semantic variables to `--color-*`.
- Dark mode is variable-driven (good direction): root + `.dark` override base variables, not per-component color rewrites.
  - Evidence: `apps/web/src/app/globals.css:8-61` and `:63-114`.

### What is weak
- The semantic base variables are not namespaced (plain `--background`, `--foreground`, etc.), which is workable but fragile.
- Theme selector is class-based only (`.dark`) and tied to `next-themes` class mode.
  - Evidence: `apps/web/src/app/layout.tsx:62-67` uses `ThemeProvider attribute="class"`.
- There is one token file now, but too many components bypass semantic utilities.

## Production-grade v4 target pattern for this repo

Use one token entry file only: `apps/web/src/app/globals.css`.

Recommended order:
1. `@import "tailwindcss";`
2. Plugins/variants (`@plugin`, `@custom-variant` if needed)
3. Base semantic CSS variables (`:root`, `[data-theme="dark"]` or `.dark`)
4. Single top-level `@theme` mapping block
5. Optional `@layer base/components/utilities` additions

Recommended structure sketch:

```css
@import "tailwindcss";
@plugin "tailwindcss-animate";

:root {
  --ui-background: oklch(...);
  --ui-foreground: oklch(...);
  --ui-card: oklch(...);
  --ui-card-foreground: oklch(...);
  --ui-border: oklch(...);
  --ui-ring: oklch(...);
  --ui-primary: oklch(...);
  --ui-primary-foreground: oklch(...);
}

[data-theme="dark"],
.dark {
  --ui-background: oklch(...);
  --ui-foreground: oklch(...);
  /* ... */
}

@theme {
  --color-background: var(--ui-background);
  --color-foreground: var(--ui-foreground);
  --color-card: var(--ui-card);
  --color-card-foreground: var(--ui-card-foreground);
  --color-border: var(--ui-border);
  --color-ring: var(--ui-ring);
  --color-primary: var(--ui-primary);
  --color-primary-foreground: var(--ui-primary-foreground);

  --font-sans: var(--ui-font-sans);
  --radius-md: var(--ui-radius-md);
  --shadow-sm: var(--ui-shadow-sm);
}
```

## How token variables generate utilities in v4
`@theme` keys drive utility generation directly:
- `--color-background` -> `bg-background`
- `--color-foreground` -> `text-foreground`
- `--color-border` -> `border-border`
- `--color-primary` + `--color-primary-foreground` -> `bg-primary`, `text-primary-foreground`
- `--radius-*` -> `rounded-*`
- `--shadow-*` -> `shadow-*`
- `--font-*` -> `font-*`

If components keep using `bg-gray-100` / `text-zinc-700` / raw hex, tokenization is bypassed and theming quality collapses.

## Required setup corrections
1. Keep one source-of-truth token file at `apps/web/src/app/globals.css`.
2. Move to explicit semantic base namespace (`--ui-*`) and map once through `@theme`.
3. Support both `.dark` and `[data-theme="dark"]` selectors during migration.
4. Remove hard-coded palette classes from shared feature components.
5. Keep shadcn primitives as baseline and make feature UIs consume those tokens.
