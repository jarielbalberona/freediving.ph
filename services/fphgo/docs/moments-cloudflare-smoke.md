# Moments Cloudflare Stream Smoke

Run this only after real Cloudflare Stream credentials are available. Do not commit secrets.

## Required env

```bash
export MOMENTS_ENABLED=true
export CLOUDFLARE_ACCOUNT_ID=...
export CLOUDFLARE_STREAM_API_TOKEN=...
export CLOUDFLARE_STREAM_REQUIRE_SIGNED_URLS=false
```

`CLOUDFLARE_STREAM_REQUIRE_SIGNED_URLS=true` is intentionally rejected until signed playback token generation exists.

## Local services

```bash
pnpm --filter @freediving.ph/web dev
go run ./cmd/api
```

Use the normal local `.env` values for database, Clerk/dev auth, R2 image media, and web API base URL.

## Manual/API smoke

1. Open `/:username/create`.
2. Select the Moments tab and choose an MP4 or MOV under 30 seconds and 200 MB.
3. Confirm the local preview appears and the upload button stays disabled for invalid duration/type.
4. Create a Moment upload intent with `POST /v1/media/moments/upload-intents`.
5. Confirm the API response includes `uploadUrl`, `streamUid`, `postId`, `mediaItemId`, and does not include the Cloudflare API token.
6. Upload the video directly to the returned `uploadUrl`.
7. Call `POST /v1/media/moments/{postId}/complete`.
8. Poll `POST /v1/media/moments/{postId}/sync` until status is `ready`.
9. Confirm the ready response includes `playback.provider=cloudflare_stream`, `playback.hlsUrl`, and `playback.iframeUrl`.
10. Confirm the Moment appears in profile Moments, the activity/feed surface, and the dive-site Moments endpoint when a dive site was attached.
11. Confirm processing and failed Moments remain hidden from public profile/feed/dive-site reads.
12. Confirm `MomentPlayer` plays HLS in supported browsers or falls back to the Cloudflare iframe.
13. Confirm existing photo uploads, photo feed cards, and photo viewer rendering still work.
