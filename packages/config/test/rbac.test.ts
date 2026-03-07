import assert from "node:assert/strict";
import test from "node:test";

import { getEffectivePermissions, ROLE_CONFIGS, type PermissionOverrides } from "../src";

test("getEffectivePermissions merges overrides", () => {
  const overrides: PermissionOverrides = {
    "chika.post": false,
    "admin.view_audit_log": true
  };

  const effective = getEffectivePermissions("member", overrides);

  assert.equal(effective["chika.post"], false);
  assert.equal(effective["admin.view_audit_log"], true);
  assert.equal(effective["profiles.view"], true);
});

test("role configs grant expected flags", () => {
  assert.equal(ROLE_CONFIGS.member["admin.manage_settings"], false);
  assert.equal(ROLE_CONFIGS.moderator["chika.reveal_identity"], true);
  assert.equal(ROLE_CONFIGS.records_verifier["records.verify"], true);
  assert.equal(ROLE_CONFIGS.support["chika.moderate"], false);
  assert.equal(ROLE_CONFIGS.admin["admin.manage_settings"], true);
});
