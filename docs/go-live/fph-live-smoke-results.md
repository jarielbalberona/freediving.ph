# Freediving Philippines Live Smoke Results

Review time: 2026-05-19 14:09 PST (UTC+08:00)

Environment tested:
- Web target: `https://freediving-ph-app.onrender.com`
- API target: `https://freediving-ph-api.onrender.com`
- Source of target URLs: `render.yaml`
- Branch/commit inspected: `main` at `e5e2ae9`

## Route Availability Gate

Live smoke was not allowed to proceed past route availability because the target web and API are not serving.

| Route | Status | Evidence |
| --- | --- | --- |
| Web `/` | Failed | `404 Not Found`, header `x-render-routing: no-server` |
| Web `/explore` | Failed | `404 Not Found`, header `x-render-routing: no-server` |
| Web `/chika` | Failed | `404 Not Found`, header `x-render-routing: no-server` |
| Web `/sign-in` | Failed | `404 Not Found`, header `x-render-routing: no-server` |
| API `/healthz` | Failed | `404 Not Found`, header `x-render-routing: no-server` |
| API `/readyz` | Failed | `404 Not Found`, header `x-render-routing: no-server` |
| API `/v1/explore/sites` | Failed | `404 Not Found`, header `x-render-routing: no-server` |
| API `/v1/chika/categories` | Failed | `404 Not Found`, header `x-render-routing: no-server` |

## Smoke Matrix

| Smoke item | Result | Evidence / reason |
| --- | --- | --- |
| Basic public browse path | Failed | Homepage, Explore, and Chika all return Render router `404 Not Found`; the app is not serving. |
| Clerk sign-in | Blocked | `/sign-in` returns Render router `404 Not Found`; no auth entry surface is available to test. |
| Explore live path | Failed | Web `/explore` and API `/v1/explore/sites` both return Render router `404 Not Found`. |
| Media upload/readback | Blocked | Requires working web app, auth session, API, and deployed media runtime. All are unavailable. |
| Two-account messaging | Blocked | Requires working web app, auth, API, and two real accounts. Web/API are unavailable. |

## Blocker Mapping

- `FD-1104`: target environment unavailable and live smoke unproven.
- `FD-1105`: Render access/deploy control unavailable due expired/unauthorized CLI token and no usable deploy workflow.
- `FD-1106`: public domain routing unresolved if public Freediving domains are launch scope.

## Result

Smoke readiness: Not ready.

This is not a product-flow failure yet. It is earlier and more basic: the target deployment is not serving the web or API at all. Blocked smoke items remain blocked, not passed.

## Required Re-run Conditions

Before rerunning live smoke:
1. Web target must serve `/`, `/explore`, `/chika`, and `/sign-in`.
2. API target must serve `/healthz`, `/readyz`, `/v1/explore/sites`, and `/v1/chika/categories`.
3. Clerk auth config must be present in the deployed web/API environment.
4. Media runtime config must be present in the deployed API environment.
5. At least two real test accounts must be available for messaging smoke.

Only then run:
- basic public browse
- Clerk sign-in
- Explore list/detail
- media upload/readback
- two-account messaging
