import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(globalThis.process.cwd());

const threadsModelPath = path.join(repoRoot, "src/models/drizzle/threads.model.ts");
const messagesModelPath = path.join(repoRoot, "src/models/drizzle/messages.model.ts");
const eventsModelPath = path.join(repoRoot, "src/models/drizzle/events.model.ts");
const diveSpotsModelPath = path.join(repoRoot, "src/models/drizzle/diveSpots.model.ts");
const profilesServicePath = path.join(repoRoot, "src/app/profiles/profiles.service.ts");
const trainingLogsServicePath = path.join(repoRoot, "src/app/trainingLogs/trainingLogs.service.ts");
const userServicePath = path.join(repoRoot, "src/app/user/user.service.ts");
const userControllerPath = path.join(repoRoot, "src/app/user/user.controller.ts");

test("phase 5 adds soft-delete fields and hot-path indexes in models", async () => {
  const threadsModel = await readFile(threadsModelPath, "utf8");
  const messagesModel = await readFile(messagesModelPath, "utf8");
  const eventsModel = await readFile(eventsModelPath, "utf8");
  const diveSpotsModel = await readFile(diveSpotsModelPath, "utf8");

  assert.match(threadsModel, /deletedAt: timestamp\("deleted_at"/);
  assert.match(threadsModel, /comments_thread_created_at_idx/);
  assert.match(messagesModel, /messages_conversation_created_at_idx/);
  assert.match(eventsModel, /events_start_date_status_idx/);
  assert.match(diveSpotsModel, /dive_spots_state_location_idx/);
});

test("phase 5 replaces hard deletes with soft-delete updates in services", async () => {
  const profilesService = await readFile(profilesServicePath, "utf8");
  const trainingLogsService = await readFile(trainingLogsServicePath, "utf8");

  assert.match(profilesService, /\.set\(\{ deletedAt: new Date\(\) \}\)/);
  assert.match(trainingLogsService, /\.set\(\{ deletedAt: new Date\(\) \}\)/);
  assert.doesNotMatch(trainingLogsService, /\.delete\(trainingLogSessions\)/);
});

test("phase 5 user deletion path anonymizes account and blocks destructive bulk deletion", async () => {
  const userService = await readFile(userServicePath, "utf8");
  const userController = await readFile(userControllerPath, "utf8");

  assert.match(userService, /anonymizeUserAccount/);
  assert.match(userService, /accountStatus: "DELETED"/);
  assert.match(userController, /Only admins can anonymize other users/);
  assert.match(userController, /anonymizeUserAccount\(this\.request\.context!\.appUserId!\)/);
});
