# Design Tokens Audit

## Bottom line
You have tokens, but not a disciplined token system. Foundation and semantic roles are mixed together, and component code keeps ignoring semantic tokens.

## Token taxonomy

### 1) Palette/foundation tokens (optional)
Raw color scales like `brand-50..900`, `gray-50..900`, `success-*`, `warning-*`, `danger-*`.
- Current status: **missing as explicit foundation namespace**.
- Current code uses ad hoc palette classes directly in components instead.

### 2) Semantic tokens (required)
Tokens tied to UI meaning:
- `background`, `foreground`
- `card`, `card-foreground`
- `popover`, `popover-foreground`
- `primary`, `primary-foreground`
- `secondary`, `secondary-foreground`
- `muted`, `muted-foreground`
- `accent`, `accent-foreground`
- `destructive`, `destructive-foreground`
- `border`, `input`, `ring`
- `sidebar-*`
- Current status: **present** in `apps/web/src/app/globals.css` and mapped in `@theme inline`.

### 3) Component tokens (optional, useful)
Domain-specific semantic slots, e.g.:
- `status-success`, `status-warning`, `status-info`, `status-danger`
- `badge-difficulty-beginner`, `badge-difficulty-advanced`
- `notification-unread-bg`, `notification-unread-border`
- Current status: **missing**. Components fake this with literal Tailwind palette classes.

## Exact tokens currently defined

Source: `apps/web/src/app/globals.css`.

### Base variables currently defined in `:root` and overridden in `.dark`
- Color-ish semantic base vars:
  - `--background`, `--foreground`
  - `--card`, `--card-foreground`
  - `--popover`, `--popover-foreground`
  - `--primary`, `--primary-foreground`
  - `--secondary`, `--secondary-foreground`
  - `--muted`, `--muted-foreground`
  - `--accent`, `--accent-foreground`
  - `--destructive`, `--destructive-foreground`
  - `--border`, `--input`, `--ring`
  - `--chart-1..5`
  - `--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-accent`, `--sidebar-accent-foreground`, `--sidebar-border`, `--sidebar-ring`
- Typography vars:
  - `--font-sans`, `--font-serif`, `--font-mono`
- Radius vars:
  - `--radius`
- Shadow vars:
  - `--shadow-2xs`, `--shadow-xs`, `--shadow-sm`, `--shadow`, `--shadow-md`, `--shadow-lg`, `--shadow-xl`, `--shadow-2xl`
  - also intermediary vars: `--shadow-x`, `--shadow-y`, `--shadow-blur`, `--shadow-spread`, `--shadow-opacity`, `--shadow-color`
- Misc:
  - `--tracking-normal`
  - `--spacing`

### Tokens exported through `@theme inline`
- Color exports:
  - `--color-background`, `--color-foreground`
  - `--color-card`, `--color-card-foreground`
  - `--color-popover`, `--color-popover-foreground`
  - `--color-primary`, `--color-primary-foreground`
  - `--color-secondary`, `--color-secondary-foreground`
  - `--color-muted`, `--color-muted-foreground`
  - `--color-accent`, `--color-accent-foreground`
  - `--color-destructive`, `--color-destructive-foreground`
  - `--color-border`, `--color-input`, `--color-ring`
  - `--color-chart-1..5`
  - `--color-sidebar`, `--color-sidebar-foreground`, `--color-sidebar-primary`, `--color-sidebar-primary-foreground`, `--color-sidebar-accent`, `--color-sidebar-accent-foreground`, `--color-sidebar-border`, `--color-sidebar-ring`
- Font exports:
  - `--font-sans`, `--font-mono`, `--font-serif`
- Radius exports:
  - `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`
- Shadow exports:
  - `--shadow-2xs`, `--shadow-xs`, `--shadow-sm`, `--shadow`, `--shadow-md`, `--shadow-lg`, `--shadow-xl`, `--shadow-2xl`

## Missing or weak pieces
1. No explicit foundation namespace (`--palette-*`) to separate raw colors from semantic use.
2. No explicit status/component semantic tokens (`success`, `warning`, `info`) despite repeated use in cards and badges.
3. Base variable names are generic (`--background`) instead of namespaced (`--ui-background`), increasing collision risk.
4. Components directly use raw classes (`bg-gray-*`, `text-zinc-*`, `text-blue-*`, `bg-blue-*`) instead of semantic tokens.

## Recommended final token set

## Naming conventions
- Base semantic vars: `--ui-*`
- Optional raw palette: `--palette-*`
- Tailwind-exposed theme vars: `--color-*`, `--font-*`, `--radius-*`, `--shadow-*`

### Recommended semantic color set (minimum)
- Core surfaces/text:
  - `--ui-background`, `--ui-foreground`
  - `--ui-surface`, `--ui-surface-foreground` (maps to card/popover if desired)
  - `--ui-border`, `--ui-input`, `--ui-ring`
- Brand actions:
  - `--ui-primary`, `--ui-primary-foreground`
  - `--ui-secondary`, `--ui-secondary-foreground`
  - `--ui-accent`, `--ui-accent-foreground`
  - `--ui-muted`, `--ui-muted-foreground`
  - `--ui-destructive`, `--ui-destructive-foreground`
- Status semantics (for current offender components):
  - `--ui-success`, `--ui-success-foreground`
  - `--ui-warning`, `--ui-warning-foreground`
  - `--ui-info`, `--ui-info-foreground`

### Recommended `@theme` mappings
- Keep existing mappings for core primitives (`background`, `foreground`, `card`, etc.).
- Add status mappings:
  - `--color-success`, `--color-success-foreground`
  - `--color-warning`, `--color-warning-foreground`
  - `--color-info`, `--color-info-foreground`

That unlocks semantic utilities like:
- `bg-success text-success-foreground`
- `bg-warning text-warning-foreground`
- `bg-info text-info-foreground`

## Enforcement rule
Feature components should not introduce raw palette classes except rare one-off brand logos. Default policy: semantic utility classes only.
