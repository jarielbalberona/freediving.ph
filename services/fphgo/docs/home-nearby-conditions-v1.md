# Home Nearby Conditions v1

## Endpoint

- `GET /v1/home/nearby-conditions?lat=&lng=`
- Auth: optional global auth attachment only; the endpoint does not require membership.
- Missing coordinates return a Philippines-level fallback instead of an error.
- Malformed coordinates return the standard validation error shape.

## Data Sources

- Dive area: nearest approved `dive_sites` row with coordinates.
- Local report: latest active `dive_site_updates` row for the nearest site within 72 hours when it has current or visibility data.
- Forecast: backend-only Open-Meteo provider interface for sea surface temperature, 10 m wind speed, and sunrise.

The frontend never calls weather providers directly and receives only normalized labels.

## Safety Wording

- Current is `reported` only when a community report has current data. Otherwise it is `unknown`.
- Visibility is `reported` only when a community report has visibility metres. Otherwise it is `unknown`.
- Temp, wind, and sunrise can be `forecast` when the weather provider returns values.
- The response does not claim real-time conditions.

## Cache

The service caches normalized responses in memory for 10 minutes. Coordinate lookups are rounded to two decimals for cache keys. This intentionally avoids pretending GPS precision equals condition precision.

## Verification

Targeted checks:

- `cd services/fphgo && go test ./internal/features/home/... ./internal/app/...`
- `pnpm --filter @freediving.ph/types test`
- `pnpm -C apps/web test`
- `pnpm -C apps/web type-check`
