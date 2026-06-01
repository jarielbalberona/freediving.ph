import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const repoRoot = path.resolve(root, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const readRepo = (relativePath) =>
  fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

test("mobile safety APIs use shared report and block contracts", () => {
  const safetyApi = read("src/features/safety/api/safety-api.ts");
  const blockTypes = readRepo("packages/types/src/blocks.ts");
  const reportsTypes = readRepo("packages/types/src/reports.ts");

  assert.match(safetyApi, /CreateReportRequest/);
  assert.match(safetyApi, /CreateReportResponse/);
  assert.match(safetyApi, /ListBlocksResponse/);
  assert.match(safetyApi, /\/v1\/reports/);
  assert.match(safetyApi, /\/v1\/blocks/);
  assert.match(blockTypes, /CreateBlockRequest/);
  assert.match(blockTypes, /ListBlocksResponse/);
  assert.match(reportsTypes, /"user"/);
  assert.match(reportsTypes, /"message"/);
  assert.match(reportsTypes, /"chika_thread"/);
  assert.match(reportsTypes, /"chika_comment"/);
});

test("profile exposes user report and backend-canonical block actions", () => {
  const profile = read("src/features/profiles/screens/public-profile-screen.tsx");
  const safetyActions = read(
    "src/features/safety/components/profile-safety-actions.tsx",
  );
  const settings = read("src/features/auth/screens/settings-screen.tsx");

  assert.match(profile, /ProfileSafetyActions/);
  assert.match(profile, /isBlocked/);
  assert.match(profile, /hasBlockedViewer/);
  assert.match(safetyActions, /targetType="user"/);
  assert.match(safetyActions, /useBlockUserMutation/);
  assert.match(safetyActions, /useUnblockUserMutation/);
  assert.match(settings, /useBlockedUsersQuery/);
  assert.match(settings, /Unblock/);
});

test("supported content surfaces expose only report target types the backend accepts", () => {
  const chikaThread = read("src/features/chika/screens/chika-thread-detail-screen.tsx");
  const chikaComment = read("src/features/chika/components/chika-comment-card.tsx");
  const messageThread = read("src/features/messages/screens/message-thread-screen.tsx");
  const reportAction = read("src/features/safety/components/report-action.tsx");

  assert.match(chikaThread, /targetType="chika_thread"/);
  assert.match(chikaComment, /targetType="chika_comment"/);
  assert.match(messageThread, /targetType="message"/);
  assert.match(reportAction, /ReportReasonCode/);
  assert.doesNotMatch(
    `${chikaThread}\n${chikaComment}\n${messageThread}\n${reportAction}`,
    /suspend|shadowban|admin/i,
  );
});
