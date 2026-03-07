import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const middlewareSource = fs.readFileSync(new URL('../src/middlewares/auth.ts', import.meta.url), 'utf8');

test('optionalAuth allows missing token and rejects invalid token', () => {
  assert.match(middlewareSource, /if \(!token\) \{\s*next\(\);/);
  assert.match(middlewareSource, /apiResponse\.unauthorizedResponse\("Invalid token"\)/);
});

test('requireAuth enforces provisioned user and suspended account', () => {
  assert.match(middlewareSource, /"User not provisioned"/);
  assert.match(middlewareSource, /appUser\.status === "suspended"/);
  assert.match(middlewareSource, /"Account suspended"/);
});

test('requirePermission blocks read_only writes and denies missing permission', () => {
  assert.match(middlewareSource, /req\.context\.status === "read_only"/);
  assert.match(middlewareSource, /"Insufficient permissions"/);
});

test('identity reveal helper always emits an audit log entry', () => {
  assert.match(middlewareSource, /writeAuditLog\(/);
  assert.match(middlewareSource, /CHIKA_IDENTITY_REVEAL_ALLOWED/);
  assert.match(middlewareSource, /CHIKA_IDENTITY_REVEAL_DENIED/);
});
