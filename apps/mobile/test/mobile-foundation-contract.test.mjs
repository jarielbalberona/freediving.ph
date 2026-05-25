import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("mobile package aligns with repository tooling decisions", () => {
  const pkg = JSON.parse(read("package.json"));

  assert.equal(pkg.scripts.lint, "biome lint .");
  assert.ok(!JSON.stringify(pkg).includes("eslint"));
  assert.ok(!JSON.stringify(pkg).includes("prettier"));
  assert.ok(!pkg.scripts["reset-project"]);
  assert.ok(!pkg.dependencies.axios);
  assert.ok(!pkg.dependencies["drizzle-orm"]);
  assert.ok(!pkg.dependencies["expo-sqlite"]);
  assert.ok(!pkg.dependencies["@expo/ui"]);
  assert.ok(!pkg.dependencies["expo-glass-effect"]);
});

test("mobile routes stay thin and shell-backed", () => {
  assert.ok(fs.existsSync(path.join(root, "app/(app)/(tabs)/index.tsx")));
  assert.ok(fs.existsSync(path.join(root, "src/components/shell/mobile-app-shell.tsx")));
  assert.ok(fs.existsSync(path.join(root, "src/lib/api/fphgo-client.ts")));
});

test("required environment contract is documented", () => {
  const example = read(".env.example");
  const readme = read("README.md");

  assert.match(example, /EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=/);
  assert.match(example, /EXPO_PUBLIC_API_BASE_URL=/);
  assert.match(readme, /EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=/);
  assert.match(readme, /EXPO_PUBLIC_API_BASE_URL=/);
  assert.match(readme, /Biome/);
  assert.doesNotMatch(readme, /ESLint/);
  assert.doesNotMatch(readme, /Prettier/);
});

test("protected fphgo query helper gates on Clerk readiness", () => {
  const helper = read("src/lib/query/use-authenticated-fphgo-query.ts");

  assert.match(helper, /useAuth/);
  assert.match(helper, /isLoaded/);
  assert.match(helper, /isSignedIn/);
  assert.match(helper, /enabled/);
  assert.match(helper, /getToken/);
});

test("home feed uses shared activity contracts and fetch client", () => {
  const api = read("src/features/home-feed/api/get-home-activity-feed.ts");
  const hook = read("src/features/home-feed/hooks/use-home-activity-feed-query.ts");
  const mapper = read("src/features/home-feed/lib/activity-card-model.ts");

  assert.match(api, /@freediving\.ph\/types/);
  assert.match(api, /ActivityFeedResponse/);
  assert.match(api, /fphgoFetch/);
  assert.match(api, /\/v1\/feed\/activity/);
  assert.doesNotMatch(api, /axios/i);
  assert.match(hook, /mobileQueryKeys\.feed\.activity/);
  assert.match(mapper, /\/\(app\)\/chika\/\[slug\]/);
  assert.match(mapper, /\/\(app\)\/events\/\[slug\]/);
  assert.match(mapper, /\/\(app\)\/explore\/\[slug\]/);
});

test("explore uses shared contracts and safe mobile routes", () => {
  const api = read("src/features/explore/api/explore-api.ts");
  const card = read("src/features/explore/components/explore-site-card.tsx");
  const detail = read("src/features/explore/screens/explore-site-detail-screen.tsx");
  const format = read("src/features/explore/lib/explore-format.ts");

  assert.match(api, /@freediving\.ph\/types/);
  assert.match(api, /ExploreListResponse/);
  assert.match(api, /ExploreSiteDetailResponse/);
  assert.match(api, /fphgoFetch/);
  assert.match(api, /\/v1\/explore\/sites/);
  assert.doesNotMatch(api, /axios/i);
  assert.doesNotMatch(api, /features\/explore\/types/);
  assert.match(card, /safeSiteSlug/);
  assert.match(card, /\/\(app\)\/explore\/\[slug\]/);
  assert.match(detail, /useLocalSearchParams/);
  assert.doesNotMatch(api, /method:\s*"(POST|PATCH|DELETE|PUT)"/);
  assert.doesNotMatch(detail, /bookmark|gps/i);
  assert.ok(format.includes('includes("/")'));
});

test("chika uses shared contracts and read-only mobile routes", () => {
  const api = read("src/features/chika/api/chika-api.ts");
  const card = read("src/features/chika/components/chika-thread-card.tsx");
  const detail = read("src/features/chika/screens/chika-thread-detail-screen.tsx");
  const format = read("src/features/chika/lib/chika-format.ts");

  assert.match(api, /@freediving\.ph\/types/);
  assert.match(api, /ChikaThreadListResponse/);
  assert.match(api, /ChikaThreadResponse/);
  assert.match(api, /ChikaCommentListResponse/);
  assert.match(api, /fphgoFetch/);
  assert.match(api, /\/v1\/chika\/threads/);
  assert.doesNotMatch(api, /axios/i);
  assert.doesNotMatch(api, /features\/chika\/types/);
  assert.doesNotMatch(api, /method:\s*"(POST|PATCH|DELETE|PUT)"/);
  assert.match(card, /safeChikaSlug/);
  assert.match(format, /authorDisplayName/);
  assert.match(card, /\/\(app\)\/chika\/\[slug\]/);
  assert.match(detail, /useLocalSearchParams/);
  assert.doesNotMatch(detail, /createComment|setReaction|websocket|realtime/i);
  assert.ok(format.includes('includes("/")'));
});
