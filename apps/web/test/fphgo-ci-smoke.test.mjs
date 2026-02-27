import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.FPHGO_BASE_URL;

if (!baseUrl) {
  throw new Error("FPHGO_BASE_URL is required for smoke tests");
}

const request = async (path, init = {}) => {
  const response = await fetch(`${baseUrl}${path}`, init);
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  return { response, body };
};

test("public health endpoint is reachable", async () => {
  const { response, body } = await request("/healthz");
  assert.equal(response.status, 200);
  assert.equal(body.status, "ok");
});

test("protected member endpoint is reachable with test auth harness", async () => {
  const { response, body } = await request("/v1/me", {
    headers: {
      "X-User-ID": "ci-smoke-user",
    },
  });

  assert.equal(response.status, 200);
  assert.equal(body.clerkSubject, "ci-smoke-user");
  assert.equal(typeof body.userId, "string");
  assert.notEqual(body.userId.length, 0);
  assert.equal(Array.isArray(body.permissions), true);
});

test("migrated blocks endpoint is reachable with test auth harness", async () => {
  const { response, body } = await request("/v1/blocks/", {
    headers: {
      "X-User-ID": "ci-smoke-user",
    },
  });

  assert.equal(response.status, 200);
  assert.equal(Array.isArray(body.items), true);
});
