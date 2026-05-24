import assert from "node:assert/strict";
import test from "node:test";

import {
  getEffectivePermissions,
  ROLE_CONFIGS,
  type PermissionOverrides,
} from "../src";

test("getEffectivePermissions merges overrides", () => {
  const overrides: PermissionOverrides = {
    "chika.write": false,
    "reports.read": true,
  };

  const effective = getEffectivePermissions("member", overrides);

  assert.equal(effective["chika.write"], false);
  assert.equal(effective["reports.read"], true);
  assert.equal(effective["profiles.read"], true);
});

test("role configs grant expected flags", () => {
  assert.equal(ROLE_CONFIGS.member["users.manage"], false);
  assert.equal(ROLE_CONFIGS.moderator["chika.reveal_identity"], true);
  assert.equal(ROLE_CONFIGS.explore_curator["explore.moderate"], true);
  assert.equal(ROLE_CONFIGS.records_verifier["reports.write"], true);
  assert.equal(ROLE_CONFIGS.support["chika.moderate"], false);
  assert.equal(ROLE_CONFIGS.admin["users.manage"], true);
});

test("specialist roles do not gain global operator permissions", () => {
  const restrictedFlags = [
    "users.manage",
    "groups.manage",
    "events.manage",
    "reports.moderate",
    "moderation.write",
  ] as const;

  for (const role of [
    "trusted_member",
    "support",
    "explore_curator",
    "records_verifier",
  ] as const) {
    for (const flag of restrictedFlags) {
      assert.equal(ROLE_CONFIGS[role][flag], false, `${role} ${flag}`);
    }
  }
});
