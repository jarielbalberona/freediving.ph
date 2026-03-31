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
  const paths = ["/v1/auth/session", "/v1/blocks", "/v1/buddies"];
  for (const path of paths) {
    const { response, body } = await request(path);
    assert.equal(response.status, 401, `expected 401 for ${path}`);
    assert.equal(body.error?.code, "unauthenticated", `expected unauthenticated for ${path}`);
  }
});

// ── Identity bootstrap + session ────────────────────────────────────

test("GET /v1/auth/session — canonical session with dev auth harness", async () => {
  const { response, body } = await authedRequest("/v1/auth/session");
  assert.equal(response.status, 200);
  assert.equal(body.clerkSubject, SMOKE_USER);
  assert.equal(typeof body.userId, "string");
  assert.notEqual(body.userId.length, 0);
  assert.equal(body.globalRole, "member");
  assert.equal(body.accountStatus, "active");
  assert.equal(Array.isArray(body.permissions), true);
  assert.ok(body.permissions.length > 0, "member should have permissions");
});

test("GET /v1/me — legacy session alias remains readable", async () => {
  const { response, body } = await authedRequest("/v1/me");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("deprecation"), "true");
  assert.equal(response.headers.get("link"), '</v1/auth/session>; rel="successor-version"');
  assert.equal(body.clerkSubject, SMOKE_USER);
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

test("GET /v1/messages/threads — messaging threads", async () => {
  const { response, body } = await authedRequest("/v1/messages/threads?category=primary");
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

// ── Migrated feature: reports ───────────────────────────────────────

test("POST /v1/reports — validation error on empty body", async () => {
  const { response, body } = await authedRequest("/v1/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.equal(response.status, 400);
  assert.equal(body.error?.code, "validation_error");
  assert.equal(Array.isArray(body.error?.issues), true);
  assert.ok(body.error.issues.length > 0, "expected at least one validation issue");
  const issue = body.error.issues[0];
  assert.equal(Array.isArray(issue.path), true, "issue.path must be an array");
  assert.equal(typeof issue.code, "string", "issue.code must be a string");
  assert.equal(typeof issue.message, "string", "issue.message must be a string");
});

// ── Migrated feature: media ─────────────────────────────────────────

test("GET /v1/media/mine — media list", async () => {
  const { response, body } = await authedRequest("/v1/media/mine");
  assert.equal(response.status, 200);
  assert.equal(Array.isArray(body.items), true);
});

test("POST /v1/media/urls — validation error on empty body", async () => {
  const { response, body } = await authedRequest("/v1/media/urls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.equal(response.status, 400);
  assert.equal(body.error?.code, "validation_error");
});
