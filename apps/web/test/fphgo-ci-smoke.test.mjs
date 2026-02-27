import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.FPHGO_BASE_URL;

if (!baseUrl) {
  throw new Error("FPHGO_BASE_URL is required for smoke tests");
}

const SMOKE_USER = "ci-smoke-user";

const request = async (path, init = {}) => {
  const response = await fetch(`${baseUrl}${path}`, init);
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  return { response, body };
};

const authedRequest = (path, init = {}) =>
  request(path, {
    ...init,
    headers: { "X-User-ID": SMOKE_USER, ...init.headers },
  });

// ── Public endpoints ────────────────────────────────────────────────

test("GET /healthz — public health check", async () => {
  const { response, body } = await request("/healthz");
  assert.equal(response.status, 200);
  assert.equal(body.status, "ok");
  assert.equal(typeof body.version, "string");
});

test("GET /readyz — DB readiness check", async () => {
  const { response, body } = await request("/readyz");
  assert.equal(response.status, 200);
  assert.equal(body.status, "ready");
});

// ── Auth gate: unauthenticated requests are rejected ────────────────

test("protected endpoints return 401 without auth", async () => {
  const paths = ["/v1/me", "/v1/blocks", "/v1/buddies"];
  for (const path of paths) {
    const { response, body } = await request(path);
    assert.equal(response.status, 401, `expected 401 for ${path}`);
    assert.equal(body.error?.code, "unauthenticated", `expected unauthenticated for ${path}`);
  }
});

// ── Identity bootstrap + session ────────────────────────────────────

test("GET /v1/me — session with dev auth harness", async () => {
  const { response, body } = await authedRequest("/v1/me");
  assert.equal(response.status, 200);
  assert.equal(body.clerkSubject, SMOKE_USER);
  assert.equal(typeof body.userId, "string");
  assert.notEqual(body.userId.length, 0);
  assert.equal(body.globalRole, "member");
  assert.equal(body.accountStatus, "active");
  assert.equal(Array.isArray(body.permissions), true);
  assert.ok(body.permissions.length > 0, "member should have permissions");
});

// ── Migrated feature: blocks ────────────────────────────────────────

test("GET /v1/blocks — blocks list", async () => {
  const { response, body } = await authedRequest("/v1/blocks");
  assert.equal(response.status, 200);
  assert.equal(Array.isArray(body.items), true);
});

// ── Migrated feature: buddies ───────────────────────────────────────

test("GET /v1/buddies — buddies list", async () => {
  const { response, body } = await authedRequest("/v1/buddies");
  assert.equal(response.status, 200);
  assert.equal(Array.isArray(body.items), true);
});

// ── Migrated feature: chika ─────────────────────────────────────────

test("GET /v1/chika/categories — category list", async () => {
  const { response, body } = await authedRequest("/v1/chika/categories");
  assert.equal(response.status, 200);
  assert.equal(Array.isArray(body.items), true);
});

test("GET /v1/chika/threads — thread list", async () => {
  const { response, body } = await authedRequest("/v1/chika/threads");
  assert.equal(response.status, 200);
  assert.equal(Array.isArray(body.items), true);
  assert.ok(body.pagination != null, "expected pagination object");
  assert.equal(typeof body.pagination.limit, "number");
  assert.equal(typeof body.pagination.offset, "number");
});

// ── Migrated feature: messaging ─────────────────────────────────────

test("GET /v1/messages/inbox — messaging inbox", async () => {
  const { response, body } = await authedRequest("/v1/messages/inbox");
  assert.equal(response.status, 200);
  assert.equal(Array.isArray(body.items), true);
});

// ── Migrated feature: profiles ──────────────────────────────────────

test("GET /v1/me/profile — own profile", async () => {
  const { response, body } = await authedRequest("/v1/me/profile");
  assert.equal(response.status, 200);
  assert.ok(body.profile != null, "expected profile object");
  assert.equal(typeof body.profile.userId, "string");
  assert.equal(typeof body.profile.username, "string");
});
