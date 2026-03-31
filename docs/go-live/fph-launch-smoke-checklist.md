# FPH Launch Smoke Checklist

This is the real go-live smoke path for the current branch.

It is not aspirational. If a check below cannot be executed in the target environment, launch is not ready.

## 1. Preconditions

- API is deployed from `services/fphgo` with production env configured.
- Web is deployed from `apps/web` and points to the same API base URL.
- Database migrations are up to date.
- Clerk production keys are present.
- Media env is present and valid:
  - `R2_ACCOUNT_ID`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET_NAME`
  - `CDN_BASE_URL`
  - `MEDIA_SIGNING_SECRET_V1`
- At least two test member accounts exist for messaging and buddy flows.
- At least one real dive site exists in the API database.

If any precondition is false, stop calling this a launch check. Fix the environment first.

## 2. Automated Smoke Already In Repo

Existing script:
- `apps/web/test/fphgo-ci-smoke.test.mjs`

Run:

```bash
cd apps/web
FPHGO_BASE_URL=http://localhost:4000 node --test test/fphgo-ci-smoke.test.mjs
```

What it currently proves:
- `GET /healthz` responds successfully.
- `GET /readyz` confirms database readiness.
- protected routes reject unauthenticated access.
- `/v1/auth/session` works through the dev-auth smoke harness.
- `/v1/me` still behaves as the deprecated legacy alias.
- basic blocks, buddies, chika, messaging, profile, reports, and media read/validation routes respond.

What it does not prove:
- real Clerk sign-in from web
- real R2 upload or CDN readback
- message request accept/decline with two users
- explore UI behavior in browser
- groups/events interactive flows in browser

Treat it as a liveness gate, not a launch signoff by itself.

## 3. Manual Launch Smoke

Use the deployed web app and deployed API. Do not run this only against localhost and pretend production is covered.

### A. Platform and Auth

- Open the web homepage and confirm it loads without broken navigation.
- Sign in through Clerk from the real web app.
- Confirm the signed-in session resolves current user identity.
- Open your profile via `/{username}` and confirm the route resolves correctly.
- Confirm old `/profile` path still redirects instead of becoming the canonical surface again.

Block launch if:
- sign-in fails
- signed-in session does not hydrate
- `/{username}` route fails or loops

### B. Media and Profile

- Upload a profile avatar from the web app.
- Confirm the avatar persists after refresh.
- Publish at least one profile media post.
- Confirm the profile media grid loads the new item.
- Open the media item and confirm the rendered URL is served from the configured media delivery path.

Block launch if:
- upload fails
- upload succeeds but the asset does not read back
- minted media URLs fail
- profile media appears only locally and disappears after refresh

### C. Messaging

- From account A, start a first-time conversation with account B through a real product entry point.
- On account B, open Messages and confirm the thread is visibly still a request.
- Accept the request from account B.
- Confirm the thread moves into normal messaging behavior and replies work both ways.
- Repeat with a fresh request and decline it.
- Confirm the declined thread is resolved honestly and cannot be treated as an active chat without reopening through the supported flow.

Block launch if:
- request-state is invisible
- recipient cannot accept or decline
- accepted threads do not become normal chats
- decline leaves a misleading active thread state

### D. Explore and Buddy Flows

- Open `/explore` and confirm cards come from real API data, not mock placeholders.
- Open at least one site detail page and confirm slug-based navigation resolves correctly.
- Confirm explore list pagination continues using real API data.
- Save and unsave a site while signed in.
- On a site detail page, verify buddy preview renders and is tied to the real site.

Block launch if:
- explore still depends on mock-only data in the live path
- site detail routing breaks on slug
- save/unsave silently fails

### E. Buddy Finder and Buddies

- Create a buddy intent while signed in.
- Confirm it appears in your own intents list.
- Confirm browse or preview surfaces still render without exposing blocked or invalid states.
- Use the message/contact path from a buddy surface and verify it lands in the real messaging flow.

Block launch if:
- intents cannot be created or read back
- site-linked flows fall apart into area-only ambiguity when a site is present
- contact path dead-ends

### F. Groups and Events

- Open `/groups` and confirm open groups can still be joined.
- Confirm approval-based groups are not pretending an approval queue exists; the UI should state invite-required launch behavior instead.
- Open `/events`, create or join a launch-valid event, and confirm detail and attendee behavior remain consistent.

Block launch if:
- groups still advertise approval workflows that do not exist
- open join is broken
- events list/detail/join are inconsistent

### G. Chika and Basic Moderation

- Open `/chika`, list categories, and open a real thread.
- In a pseudonymous category, confirm author identity is not exposed like a normal member profile.
- Confirm report actions exist on thread and comment surfaces.

Block launch if:
- pseudonymous author identity leaks to normal members
- report path is missing from live UI

### H. Navigation Truth

- Confirm launch nav does not advertise Competitive Records, Training Logs, Safety, Awareness, Services, Media, Marketplace, or Collaboration as live product areas.
- Confirm the current nav only exposes launch-supported surfaces.

Block launch if:
- fake or coming-soon routes are visible in launch nav

## 4. Required Launch Outcome

Launch is only green when:
- automated smoke passes
- manual smoke passes for auth, profile media, messaging, explore, buddy flows, groups/events, and chika
- any blocked checks are explicitly resolved, not hand-waved

Launch is blocked when:
- production media env is missing or invalid
- Clerk sign-in is not proven end to end
- any core user-visible flow above is broken, fake, or unresolved

## 5. Known Limits Of This Checklist

- The current automated smoke script relies on the dev-auth harness using `X-User-ID`. That is useful for API smoke, but it is not sufficient proof of real production Clerk behavior.
- Real media verification still requires a target environment with working R2/CDN config.
- Two-account messaging and buddy verification cannot be faked with a single-user smoke run.

If someone wants to declare go-live readiness without these checks, they are guessing.
