# Freediving Philippines Mobile

Phone-first Expo app for Freediving Philippines. The app shell is implemented; real feature
surfaces should consume `services/fphgo` `/v1` APIs through shared contracts in
`@freediving.ph/types`.

## Stack

- Expo SDK 56 with Expo Router typed routes
- React Native 0.85.3 and React 19.2.3, managed by Expo
- Clerk Expo auth with SecureStore token cache
- TanStack Query for server state
- Zustand only for shell/menu UI state
- NativeWind 4.1.23 with Tailwind CSS 3.4
- Fetch-based `fphgoFetch` API client
- Biome for lint/format, matching the repo
- Sentry stubbed through `EXPO_PUBLIC_SENTRY_DSN`

Do not add Axios, Drizzle, SQLite, push notifications, background location, or offline-first
architecture in the foundation lane.

## Environment

Create `apps/mobile/.env` with:

```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_replace_me
EXPO_PUBLIC_API_BASE_URL=http://localhost:4000
EXPO_PUBLIC_SENTRY_DSN=
```

`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` and `EXPO_PUBLIC_API_BASE_URL` are required.
`EXPO_PUBLIC_SENTRY_DSN` is optional.

## Development

Install dependencies from the repository root:

```bash
pnpm install
```

Start Metro:

```bash
pnpm -C apps/mobile start
```

Run Android:

```bash
pnpm -C apps/mobile android
```

The Pixel Tablet AVD is acceptable for smoke testing, but the app is intentionally
phone-first and portrait. Tablet screens should show a centered phone-style layout,
not a stretched dashboard.

## Verification

```bash
pnpm -C apps/mobile type-check
pnpm -C apps/mobile lint
pnpm -C apps/mobile test
pnpm -C apps/mobile doctor
pnpm dlx expo-doctor@latest
```

Use repo-level checks when a change touches shared packages or app contracts:

```bash
pnpm typecheck
pnpm lint
```
