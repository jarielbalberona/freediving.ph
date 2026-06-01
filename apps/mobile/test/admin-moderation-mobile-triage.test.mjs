import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("mobile moderation triage uses report contracts and authenticated routes", () => {
  const api = read("src/features/moderation/api/moderation-api.ts");
  const hooks = read("src/features/moderation/hooks/use-moderation.ts");
  const route = read("app/(app)/(tabs)/(home)/moderation.tsx");
  const layout = read("app/(app)/(tabs)/(home)/_layout.tsx");

  assert.match(api, /ListReportsResponse/);
  assert.match(api, /GetReportDetailResponse/);
  assert.match(api, /UpdateReportStatusResponse/);
  assert.match(api, /listModerationReports/);
  assert.match(api, /getModerationReport/);
  assert.match(api, /updateModerationReportStatus/);
  assert.match(api, /\/v1\/reports/);

  assert.match(hooks, /useModerationReportsQuery/);
  assert.match(hooks, /useModerationReportQuery/);
  assert.match(hooks, /useModerationReportStatusMutation/);
  assert.match(hooks, /getRequiredToken/);

  assert.match(route, /MobileAuthRequired/);
  assert.match(route, /ModerationTriageScreen/);
  assert.match(layout, /name="moderation"/);
});

test("mobile moderation remains triage-first and avoids destructive actions", () => {
  const screen = read("src/features/moderation/screens/moderation-triage-screen.tsx");
  const resolver = read("src/features/shared/links/lib/resolve-fph-link.ts");

  assert.match(screen, /Triage queue/);
  assert.match(screen, /Audit note required/);
  assert.match(screen, /Mark reviewing/);
  assert.match(screen, /Resolve/);
  assert.match(screen, /Reject report/);
  assert.match(screen, /Alert\.alert/);
  assert.match(screen, /triage-only/i);
  assert.doesNotMatch(
    screen,
    /Suspend user|Unsuspend user|Hide thread|Unhide thread|Hide comment|Unhide comment/,
  );

  assert.match(resolver, /parts\[0\] === "admin"/);
  assert.match(resolver, /admin.*moderation/s);
  assert.match(resolver, /reportId=/);
});
