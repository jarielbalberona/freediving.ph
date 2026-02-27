# Production-grade setup for fphgo

This doc suggests what “production-grade” means for this service: what you already have, and what to add or tighten.

---

## What you already have (keep)

| Area | Current | Notes |
|------|---------|--------|
| **Shutdown** | Signal handling, 10s timeout, `Server.Shutdown` | Graceful drain |
| **Health** | `/healthz`, `/readyz` with DB ping | LB and k8s friendly |
| **Server timeouts** | ReadHeader 5s, Read 15s, Write 30s, Idle 60s | Avoids stuck connections |
| **Logging** | `slog` JSON, env-based level | Structured, level from `APP_ENV` |
| **Config** | Env-only, required vars validated at startup | 12-factor; prod requires `CLERK_SECRET_KEY` |
| **Auth** | Clerk JWT, RequireMember, 401 JSON | No auth in handlers |
| **CORS / Rate limit** | Middleware, configurable origins | In-memory rate limit per instance |
| **Request ID** | Middleware, passed to error responses | Good for support/debug |
| **Recovery** | Panic recover middleware | No crash on handler panic |
| **DB** | pgxpool, MaxConns 20, MinConns 2, Ping on init | Pool tuned; ready check uses pool |
| **Docker** | Multi-stage, non-root user | Small image, no root |

---

## Recommended additions (prioritized)

### 1. Observability and ops

- **Request ID in every log line**  
  Add `request_id` to the request logger so each log line for a request can be correlated. Right now it’s only in error responses.

- **Metrics (RED)**  
  Add a `/metrics` endpoint (Prometheus) or at least a small metrics struct (counters for request count by path/status, latency histogram or p99). Optional: OpenTelemetry for traces later.

- **Log level from env**  
  Allow `LOG_LEVEL=debug|info|warn|error` so production can be set to `info` without changing `APP_ENV`.

- **Build version in binary and /healthz**  
  Build with `-ldflags "-X main.Version=..."` and expose `version` in `/healthz` (or a separate `/version`) for rollouts and support.

### 2. Config and security hardening

- **Production guardrails**  
  In `config.Load()` when `APP_ENV=production`:  
  - Reject `CORS_ORIGINS=*` (require explicit origins).  
  - Reject `DEV_AUTH=true`.  
  So production cannot accidentally run with permissive CORS or dev auth.

- **Max request body size**  
  Wrap the router (or body read) with `http.MaxBytesReader` (e.g. 1–2 MB for JSON APIs) to avoid large-body DoS.

- **Security headers**  
  Add a middleware that sets:  
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and optionally `Content-Security-Policy` (or a minimal value).  
  Keeps behavior consistent and satisfies scanners.

- **Rate limit and pool size from env**  
  - `RATE_LIMIT_PER_MINUTE` (default 300).  
  - `DB_MAX_CONNS` / `DB_MIN_CONNS` so production can tune without code change.

### 3. Resilience

- **DB pool lifetime**  
  Set `ConnMaxLifetime` (and if available `MaxConnIdleTime`) on pgx pool so connections are refreshed (e.g. 30m max lifetime). Reduces impact of DB restarts or firewall idle timeouts.

- **Shutdown order**  
  On shutdown, stop accepting new requests (already done by `Server.Shutdown`), then signal the WebSocket hub to stop (e.g. cancel the context passed to `Hub.Run`) so the process can exit cleanly instead of waiting for goroutines.

- **Readiness includes dependencies (optional)**  
  If you add more dependencies (cache, external API), extend `ReadyCheck` to ping them so the LB doesn’t send traffic to an instance that can’t reach DB or critical deps.

### 4. Build and deploy

- **Docker**  
  - Use `PORT` from env in `EXPOSE` or document that the orchestrator overrides.  
  - Add a `HEALTHCHECK` that hits `http://localhost:${PORT}/healthz` so Docker/Kubernetes can mark the container unhealthy.

- **Version / commit at build time**  
  In CI:  
  `go build -ldflags "-X main.Version=$(git describe --always) -X main.BuildTime=$(date -u +%Y-%m-%dT%H:%M:%SZ)" ./cmd/api`  
  and log or expose them for debugging.

### 5. Rate limiting at scale

- **Current behavior**  
  In-memory per-instance bucket; under a load balancer each instance has its own limit (effective limit ≈ N × limit for N instances). Document this.

- **Stricter production option**  
  If you need a global or per-user limit later, use a shared store (e.g. Redis) or a gateway-level limit. Not required for v1 if the current limit is acceptable.

### 6. Documentation and contracts

- **Env reference**  
  Single source of truth for all env vars (e.g. in `README.md` or `docs/env.md`) with: required vs optional, default, and production notes. `.env.example` already helps; keep it in sync.

- **API contract**  
  OpenAPI (Swagger) or a small spec for public endpoints improves onboarding and allows generated clients or contract tests. Optional for v1 but recommended for “production-grade” long term.

---

## Minimal “production-ready” set

If you want the smallest set of changes to call it production-grade:

1. **Production config guards**: reject `CORS_ORIGINS=*` and `DEV_AUTH=true` when `APP_ENV=production`.  
2. **Request ID in request logs**: so support can trace a request end-to-end.  
3. **Max request body size**: e.g. 1 MB for JSON bodies.  
4. **Security headers middleware**: at least `X-Content-Type-Options`, `X-Frame-Options`.  
5. **Shutdown**: cancel Hub context in `main` when shutting down so the process exits cleanly.  
6. **Docker HEALTHCHECK**: `HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O- http://localhost:${PORT:-4000}/healthz || exit 1` (or equivalent).  
7. **Build version**: `-ldflags` for version/commit and expose in `/healthz` or `/version`.

Everything else (metrics, OpenAPI, Redis rate limit, DB pool env) can follow as you scale or harden further.

---

## Summary table

| Recommendation | Effort | Impact |
|----------------|--------|--------|
| Request ID in logs | Low | High (debugging) |
| Production CORS/DEV_AUTH guards | Low | High (security) |
| Max request body size | Low | Medium (resilience) |
| Security headers | Low | Medium (compliance) |
| Hub shutdown on graceful stop | Low | Medium (clean exits) |
| Docker HEALTHCHECK | Low | Medium (orchestration) |
| Build version + /healthz | Low | Medium (ops) |
| LOG_LEVEL env | Low | Low |
| RATE_LIMIT / DB pool from env | Low | Low |
| DB ConnMaxLifetime | Low | Medium (resilience) |
| /metrics (Prometheus) | Medium | High (observability) |
| OpenAPI spec | Medium | Medium (contracts) |
