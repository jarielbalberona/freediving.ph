# Explore Dive Spots API Contract

This document is the source of truth for the Explore page integration.

## Dive spots list/map

### GET `/dive-spots`

Query params:
- `shape`: `list | map` (default `list`)
- `search`, `location`, `difficulty`, `north`, `south`, `east`, `west`, `sort`, `limit`, `offset`

Behavior:
- Only published and non-deleted spots are returned (`state = PUBLISHED`, `deleted_at IS NULL`).
- Bounds validation: `north >= south`, `east >= west`.

Response includes aggregate fields:
- `avgRating`
- `ratingCount`
- `commentCount`

`shape=map` payload is minimized for marker/card rendering.

Example request:

```bash
curl "http://localhost:8080/dive-spots?shape=map&north=14&south=5&east=126&west=118&limit=100&offset=0"
```

Example response (truncated):

```json
{
  "status": 200,
  "message": "Dive spots retrieved successfully",
  "data": [
    {
      "id": 1,
      "name": "Anilao",
      "lat": 13.72,
      "lng": 120.88,
      "locationName": "Batangas",
      "avgRating": 4.8,
      "ratingCount": 42,
      "commentCount": 18
    }
  ]
}
```

## Spot detail

### GET `/dive-spots/:id`

Returns one published, non-deleted spot.

Example:

```bash
curl "http://localhost:8080/dive-spots/1"
```

## Reviews (composed resource)

### GET `/dive-spots/:id/reviews`

Query params:
- `limit`, `offset`, `sort=newest|oldest`

### POST `/dive-spots/:id/reviews`

Auth required.

Body:
- `rating` (1..5)
- `comment` (optional)

Behavior:
- One rating row per user per spot (upsert/update).
- Top-level comment is upserted per user per spot to avoid duplicate growth on repeated edits.

Example:

```bash
curl -X POST "http://localhost:8080/dive-spots/1/reviews" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"rating":5,"comment":"Great spot for line training."}'
```

### GET `/dive-spots/:id/reviews/summary`

Returns:
- `diveSpotId`
- `avgRating`
- `ratingCount`
- `commentCount`

## Related sections for detail sheet

### GET `/events?diveSpotId=:id&limit=&offset=`

- Uses explicit `events.dive_spot_id` relation.
- Defaults to published events unless status override is provided.

### GET `/buddies/available?diveSpotId=:id&limit=&offset=`

- Auth required.
- Uses dive spot location to find visible active users nearby.

### GET `/records?diveSpotId=:id&limit=&offset=`

- Alias to competitive records router.
- Uses explicit `competitive_records.dive_spot_id` relation.

## Migration operations

Required migrations for this feature set:
- `0031_spot_list_shape_indexes`
- `0032_events_records_dive_spot_link`
- `0033_careful_longshot` (legacy reviews cleanup + backfill)

## Environment rollout checklist

### Local

1. Start API + web.
2. Run migrations.
3. Run tests/type-check.
4. Run flow verification with a valid auth token.

### Staging

1. Run `audit:explore-backfill` and review low-confidence rows before deployment.
2. Apply migrations.
3. Run `verify:explore-flow` against staging API.
4. Run `verify:explore-performance` and capture p50/p95.
5. Run `check:explore-metrics` after traffic warm-up.

### Production

1. Backup before migration.
2. Apply migrations in low-traffic window.
3. Run backfill audit report immediately post-migration.
4. Run flow check and metrics check.
5. Watch `explore` p95 and error rate for 24h.

## Operations commands

Recommended one-shot rollout command:

```bash
pnpm -C apps/api release:explore-hardening
```

For full flow checks (requires auth token):

```bash
AUTH_TOKEN=<token> SPOT_ID=1 pnpm -C apps/api verify:explore-flow
```

Backfill audit report:

```bash
DATABASE_URL=<url> pnpm -C apps/api audit:explore-backfill
```

API performance check:

```bash
API_BASE_URL=http://localhost:8080 SPOT_ID=1 pnpm -C apps/api verify:explore-performance
```

Explore metrics threshold check:

```bash
API_BASE_URL=http://localhost:8080 \
EXPLORE_P95_THRESHOLD_MS=800 \
EXPLORE_ERROR_RATE_THRESHOLD=0.02 \
pnpm -C apps/api check:explore-metrics
```

Web runtime browser E2E:

```bash
pnpm -C apps/web test:e2e
```
