# Freediving Philippines Deployment Recovery

Review time: 2026-05-19 14:09 PST (UTC+08:00)

Repository state:
- Checkout: `/Volumes/Files/softwareengineering/my-projects/freediving.ph`
- Branch: `main`
- Commit reviewed: `e5e2ae9`

## Target Environment

Configured target URLs from `render.yaml`:
- Web: `https://freediving-ph-app.onrender.com`
- API: `https://freediving-ph-api.onrender.com`
- CDN/media base: `https://cdn.freediving.ph`

Configured Render service names:
- `freediving-ph-api`
- `freediving-ph-app`
- database `freediving-ph-db`

## Failure Symptoms

All configured web/API target routes return Render router-level 404s:

| URL | Status | Response shape |
| --- | --- | --- |
| `https://freediving-ph-app.onrender.com/` | 404 | `Not Found`, header `x-render-routing: no-server` |
| `https://freediving-ph-app.onrender.com/explore` | 404 | `Not Found`, header `x-render-routing: no-server` |
| `https://freediving-ph-app.onrender.com/chika` | 404 | `Not Found`, header `x-render-routing: no-server` |
| `https://freediving-ph-app.onrender.com/sign-in` | 404 | `Not Found`, header `x-render-routing: no-server` |
| `https://freediving-ph-api.onrender.com/healthz` | 404 | `Not Found`, header `x-render-routing: no-server` |
| `https://freediving-ph-api.onrender.com/readyz` | 404 | `Not Found`, header `x-render-routing: no-server` |
| `https://freediving-ph-api.onrender.com/v1/explore/sites` | 404 | `Not Found`, header `x-render-routing: no-server` |
| `https://freediving-ph-api.onrender.com/v1/chika/categories` | 404 | `Not Found`, header `x-render-routing: no-server` |

DNS for both `.onrender.com` targets resolves through Render/Cloudflare:
- `freediving-ph-app.onrender.com` -> `gcp-us-west1-1.origin.onrender.com` -> `216.24.57.7`, `216.24.57.251`
- `freediving-ph-api.onrender.com` -> `gcp-us-west1-1.origin.onrender.com` -> `216.24.57.7`, `216.24.57.251`

This proves the request reaches Render's edge/router, but no active server is bound to those hostnames.

## Root Cause Found

Concrete external failure mode: the configured Render hostnames are not bound to an active Render service. This is a Render routing/service availability failure, not an app-level route returning 404.

The exact underlying Render-side cause could not be proven from logs because Render access is blocked:
- `render` CLI exists at `/opt/homebrew/bin/render`.
- `render whoami` returns `failed to get current user: unauthorized`.
- `render services list -o json` returns `your token is expired; run render login to get a new one`.
- Direct Render API inspection has no usable token and returns non-success.

No usable repo-side deploy trigger was found:
- Current local workflow `.github/workflows/ci.yml` is CI only.
- GitHub lists an old `Deploy FPH` workflow, but `gh workflow view "Deploy FPH"` fails with `could not find workflow file main.yml`.
- The latest GitHub Actions runs for current `main` are CI failures, not successful deploys.

## Fixes Applied

No live deployment fix was applied because the available operator context does not have valid Render access.

Tracking fixes applied:
- Updated Linear `FD-1104` with current recovery evidence.
- Created Linear `FD-1105` for restoring Render access and deploy control.
- Created Linear `FD-1106` for public Freediving domain routing if those hostnames are in launch scope.

Repo documentation created:
- `docs/go-live/fph-deployment-recovery.md`
- `docs/go-live/fph-live-smoke-results.md`

## Deploy / Redeploy Actions Taken

None.

Reason: no valid Render token/session and no usable GitHub deploy workflow. Triggering deployment requires one of:
- refreshed Render CLI login for the workspace that owns the FPH services,
- a Render API key available to this environment,
- a Render-authorized operator to recreate/deploy from `render.yaml`,
- or a working deployment workflow restored in GitHub.

## Post-Fix Verification Results

No post-fix live verification was possible because no deploy/redeploy action could be taken.

Current verification remains failed:
- Web `/`: 404, `x-render-routing: no-server`
- Web `/explore`: 404, `x-render-routing: no-server`
- Web `/chika`: 404, `x-render-routing: no-server`
- Web `/sign-in`: 404, `x-render-routing: no-server`
- API `/healthz`: 404, `x-render-routing: no-server`
- API `/readyz`: 404, `x-render-routing: no-server`
- API `/v1/explore/sites`: 404, `x-render-routing: no-server`
- API `/v1/chika/categories`: 404, `x-render-routing: no-server`

## Additional Domain Checks

These are not the configured Render target URLs in `render.yaml`, but they are relevant if public custom domains are launch scope:

| Host | Result |
| --- | --- |
| `https://freediving.ph/` | DNS resolution failed from this environment |
| `https://www.freediving.ph/` | Vercel `404 DEPLOYMENT_NOT_FOUND` |
| `https://api.freediving.ph/` | DNS resolution failed from this environment |
| `https://app.freediving.ph/` | DNS resolution failed from this environment |
| `https://cdn.freediving.ph/` | Cloudflare 404 HTML page |

Tracked as `FD-1106`.

## Unresolved Deployment Issues

1. `freediving-ph-app.onrender.com` is not bound to an active Render server.
2. `freediving-ph-api.onrender.com` is not bound to an active Render server.
3. Render CLI token is expired/unauthorized.
4. No Render API key is available in this shell.
5. No usable GitHub deployment workflow exists in the current checkout.
6. Public custom domain scope/routing is unresolved.

## Required Recovery Steps

1. Refresh Render access: run `render login` locally or provide a valid Render API token to an authorized recovery environment.
2. Inspect actual Render services: `render services list -o json`.
3. Locate or recreate services named `freediving-ph-api` and `freediving-ph-app` from `render.yaml`.
4. Inspect deployment logs and env vars before redeploying.
5. Ensure required production env vars are present, especially Clerk, R2, CDN, media signing, and Chika pseudonym secrets.
6. Deploy API and web.
7. Re-run the live route verification matrix.
8. Only after route verification passes, run live smoke.
