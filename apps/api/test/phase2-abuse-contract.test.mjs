import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(globalThis.process.cwd());

const abuseControlsPath = path.join(repoRoot, "src/core/abuseControls.ts");
const blockingCorePath = path.join(repoRoot, "src/core/blocking.ts");
const profilesServicePath = path.join(repoRoot, "src/app/profiles/profiles.service.ts");
const threadsServicePath = path.join(repoRoot, "src/app/threads/threads.service.ts");
const threadsRoutesPath = path.join(repoRoot, "src/app/threads/threads.routes.ts");
const messagesRoutesPath = path.join(repoRoot, "src/app/messages/messages.routes.ts");
const buddiesServicePath = path.join(repoRoot, "src/app/buddies/buddies.service.ts");

test("phase 2 defines configurable abuse defaults", async () => {
	const source = await readFile(abuseControlsPath, "utf8");

	assert.match(source, /newDirectConversationsWithNonBuddiesPerDay/);
	assert.match(source, /threadsPerDay/);
	assert.match(source, /postsPerDay/);
	assert.match(source, /pseudonymousThreadsPerDay/);
	assert.match(source, /pseudonymousPostsPerDay/);
});

test("phase 2 has shared platform block helpers", async () => {
	const source = await readFile(blockingCorePath, "utf8");

	assert.match(source, /isPlatformBlockedBetween/);
	assert.match(source, /getPlatformBlockedUserIds/);
	assert.match(source, /eq\(blocks\.scope, "PLATFORM"\)/);
});

test("profile visibility checks platform blocks", async () => {
	const source = await readFile(profilesServicePath, "utf8");

	assert.match(source, /isPlatformBlockedBetween/);
	assert.match(source, /"Profile is not visible"/);
});

test("threads enforce daily limits and block-based forum visibility filtering", async () => {
	const source = await readFile(threadsServicePath, "utf8");

	assert.match(source, /ABUSE_LIMITS\.threadsPerDay/);
	assert.match(source, /ABUSE_LIMITS\.postsPerDay/);
	assert.match(source, /ABUSE_LIMITS\.pseudonymousPostsPerDay/);
	assert.match(source, /getPlatformBlockedUserIds/);
	assert.match(source, /isPlatformBlockedBetween/);
});

test("thread and message routes include phase 2 rate limiters", async () => {
	const threadsRoutes = await readFile(threadsRoutesPath, "utf8");
	const messagesRoutes = await readFile(messagesRoutesPath, "utf8");

	assert.match(threadsRoutes, /threadCreateLimiter/);
	assert.match(threadsRoutes, /threadReplyLimiter/);
	assert.match(messagesRoutes, /conversationCreateLimiter/);
	assert.match(messagesRoutes, /messageSendLimiter/);
});

test("buddy service uses configurable cooldown and platform-block logic", async () => {
	const source = await readFile(buddiesServicePath, "utf8");

	assert.match(source, /ABUSE_LIMITS\.buddyRequestsPerDay/);
	assert.match(source, /ABUSE_LIMITS\.buddyRequestRejectionCooldownDays/);
	assert.match(source, /isPlatformBlockedBetween/);
	assert.match(source, /getPlatformBlockedUserIds/);
});
