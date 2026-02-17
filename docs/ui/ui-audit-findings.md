# UI Audit Findings (Tailwind v4 + Theming)

Severity scale: Blocker / High / Medium / Low.

## Finding 1: Feature components bypass semantic tokens with hard-coded palette classes
Severity: **Blocker**

Evidence:
- `apps/web/src/features/chika/components/CreateThreadModal.tsx:63-66`

```tsx
<h2 className="text-2xl font-bold text-gray-900">Create New Thread</h2>
<button className="text-gray-400 hover:text-gray-600">
```

- `apps/web/src/features/chika/components/CreateThreadModal.tsx:84-85`

```tsx
className="... border border-gray-300 ... focus:ring-blue-500 ..."
```

Impact:
- Dark mode and future theme variants will be inconsistent.
- Design changes require touching component code instead of tokens.

Concrete fix:
- Replace with semantic classes (`text-foreground`, `border-border`, `focus:ring-ring`, `bg-background`).
- Replace native inputs/buttons with shared primitives (`Input`, `Textarea`, `Button`, `Badge`) to inherit tokenized styling.

## Finding 2: Profile settings page is class-soup theming (`zinc` + `dark:`)
Severity: **Blocker**

Evidence:
- `apps/web/src/app/profile/settings/page.tsx:23`

```tsx
className="... bg-white/50 dark:bg-zinc-950/50 ... border-zinc-200/80 dark:border-zinc-800/80"
```

- `apps/web/src/app/profile/settings/page.tsx:55`

```tsx
className="bg-white dark:bg-zinc-900/50 border-zinc-200/80 dark:border-zinc-800/80 ..."
```

Impact:
- Violates token-driven theming requirement.
- Every state change duplicates light/dark logic in components.

Concrete fix:
- Introduce semantic utilities for these states (`bg-card/50`, `border-border/80`, `text-muted-foreground` etc.).
- Keep dark logic in variables (`:root`/dark selector), not component class strings.

## Finding 3: Status badges in multiple cards are hard-coded to green/yellow/red palette classes
Severity: **High**

Evidence:
- `apps/web/src/features/diveSpots/components/DiveSpotCard.tsx:25-33`
- `apps/web/src/features/events/components/EventCard.tsx:58-67`
- `apps/web/src/features/user/components/UserCard.tsx:26-35`
- `apps/web/src/features/userServices/components/ServiceCard.tsx:42-49`

```tsx
return 'bg-green-100 text-green-800';
return 'bg-yellow-100 text-yellow-800';
return 'bg-red-100 text-red-800';
return 'bg-gray-100 text-gray-800';
```

Impact:
- Status coloring has no design-system contract.
- Hard to ensure contrast compliance across themes.

Concrete fix:
- Add semantic status tokens in `@theme` (`success/warning/info` + foreground pairs).
- Replace string maps with semantic utilities.

## Finding 4: Notification unread/read visuals use hard-coded blues/greens/grays
Severity: **High**

Evidence:
- `apps/web/src/features/notifications/components/NotificationCard.tsx:37-41`

```tsx
<Bell className="h-4 w-4 text-blue-500" />
<CheckCircle className="h-4 w-4 text-green-500" />
<Archive className="h-4 w-4 text-gray-500" />
```

- `apps/web/src/features/notifications/components/NotificationCard.tsx:59`

```tsx
'border-l-4 border-l-blue-500 bg-blue-50/50'
```

Impact:
- Theme breaks for notification emphasis; unread state is not tokenized.

Concrete fix:
- Add semantic notification tokens (`info`, `success`, muted border/background variants).
- Replace with semantic utilities and variant helpers.

## Finding 5: Raw hex and brand literals still exist in app UI
Severity: **High**

Evidence:
- `apps/web/src/app/explore/explore-view.tsx:58`

```tsx
<div className="h-full w-full bg-[#e5e3df]">
```

- `apps/web/src/app/auth/form.tsx:187`, `:200`, `:204`, `:208`, `:212`

```tsx
fill="#1877F2"
fill="#EA4335"
```

Impact:
- Untracked visual values escape the token system.

Concrete fix:
- For structural surfaces: map to semantic tokens.
- For third-party brand logos only: keep literal fills isolated in icon components and document exception.

## Finding 6: Mixed quality between shadcn primitives and feature code
Severity: **Medium**

Evidence:
- Token-aligned primitive: `apps/web/src/components/ui/card.tsx:13`

```tsx
"rounded-lg border bg-card text-card-foreground shadow-sm"
```

- Non-token feature wrapper around primitive: `apps/web/src/features/chika/components/ThreadDetail.tsx:16`

```tsx
<div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
```

Impact:
- You lose most benefits of shared primitives because wrappers restyle everything ad hoc.

Concrete fix:
- Use `Card`, `CardHeader`, `CardContent` and semantic class overrides only when necessary.

## Finding 7: Theme mechanism is class-based only; no data-theme fallback during migration
Severity: **Medium**

Evidence:
- `apps/web/src/app/layout.tsx:63` -> `ThemeProvider attribute="class"`
- `apps/web/src/app/globals.css:63` -> `.dark { ... }`

Impact:
- Works today, but migration to multi-theme or attribute-based scopes is harder.

Concrete fix:
- Support both selectors in base tokens:

```css
[data-theme="dark"], .dark { ... }
```

## Finding 8: Meta theme color values are decoupled from design tokens
Severity: **Low**

Evidence:
- `apps/web/src/config/site.ts:16-17`

```ts
light: "#ffffff",
dark: "#09090b",
```

Impact:
- Visual mismatch risk if background tokens change and meta colors do not.

Concrete fix:
- Derive theme-color from token values (or centralize in one token source and sync in one place).

## Top offenders by raw/dark palette usage count
Evidence generated via repo-wide class scan:
- `apps/web/src/app/profile/settings/page.tsx` -> 100 matches
- `apps/web/src/features/chika/components/CreateThreadModal.tsx` -> 12 matches
- `apps/web/src/features/chika/components/ThreadCard.tsx` -> 9 matches
- `apps/web/src/features/diveSpots/components/DiveSpotCard.tsx` -> 7 matches
- `apps/web/src/features/chika/components/ThreadList.tsx` -> 7 matches
- `apps/web/src/app/auth/form.tsx` -> 6 matches

## Suggested codemod/search-replace patterns
1. `bg-white` -> `bg-background` (or `bg-card` depending on container role)
2. `text-gray-900` -> `text-foreground`
3. `text-gray-600|text-gray-500|text-zinc-700` -> `text-muted-foreground`
4. `border-gray-200|border-zinc-200/80` -> `border-border`
5. `bg-gray-100|bg-zinc-100` -> `bg-muted`
6. `text-white` on action surfaces -> `text-primary-foreground` if paired with `bg-primary`
7. `dark:*` class-pairs for color -> remove and rely on semantic tokens + variables

Do not blindly replace brand icon fills (`#1877F2`, Google multi-color) unless brand guidelines allow it.
