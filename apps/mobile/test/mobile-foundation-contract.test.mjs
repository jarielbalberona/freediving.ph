import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("mobile package aligns with repository tooling decisions", () => {
  const pkg = JSON.parse(read("package.json"));

  assert.equal(
    pkg.scripts.lint,
    "biome lint app src test app.json babel.config.cjs metro.config.cjs tailwind.config.cjs",
  );
  assert.ok(!JSON.stringify(pkg).includes("eslint"));
  assert.ok(!JSON.stringify(pkg).includes("prettier"));
  assert.ok(!pkg.scripts["reset-project"]);
  assert.ok(!pkg.dependencies.axios);
  assert.ok(!pkg.dependencies["drizzle-orm"]);
  assert.ok(pkg.dependencies["expo-sqlite"]);
  assert.equal(pkg.dependencies["@expo/ui"], "~56.0.14");
  assert.ok(pkg.dependencies["@expo/vector-icons"]);
  assert.ok(!pkg.dependencies["lucide-react-native"]);
  assert.ok(!pkg.dependencies["expo-glass-effect"]);
});

test("mobile routes stay thin and shell-backed", () => {
  assert.ok(
    fs.existsSync(path.join(root, "app/(app)/(tabs)/(home)/index.tsx")),
  );
  assert.ok(
    fs.existsSync(path.join(root, "app/(app)/(tabs)/search/index.tsx")),
  );
  assert.ok(
    fs.existsSync(path.join(root, "app/(app)/(tabs)/search/_layout.tsx")),
  );
  assert.ok(
    fs.existsSync(path.join(root, "app/(app)/(tabs)/(home)/profile/index.tsx")),
  );
  assert.ok(
    fs.existsSync(
      path.join(root, "app/(app)/(tabs)/(home)/profile/settings.tsx"),
    ),
  );
  assert.ok(
    fs.existsSync(
      path.join(root, "app/(app)/(tabs)/(home)/profile/[username].tsx"),
    ),
  );
  assert.ok(
    fs.existsSync(
      path.join(root, "src/components/shell/mobile-native-header.tsx"),
    ),
  );
  assert.equal(
    fs.existsSync(
      path.join(root, "src/components/shell/mobile-top-header.tsx"),
    ),
    false,
  );
  assert.ok(fs.existsSync(path.join(root, "src/lib/api/fphgo-client.ts")));
});

test("native tabs expose mobile search without fake search plumbing", () => {
  const sharedNav = read("../../packages/types/src/navigation.ts");
  const mobileNav = read("src/config/navigation.ts");
  const tabsLayout = read("app/(app)/(tabs)/_layout.tsx");
  const nativeHeader = read("src/components/shell/mobile-native-header.tsx");
  const homeLayout = read("app/(app)/(tabs)/(home)/_layout.tsx");
  const createRoute = read("app/(app)/(tabs)/create/index.tsx");
  const createScreen = read("src/features/create/screens/create-screen.tsx");
  const chikaScreen = read("src/features/chika/screens/chika-screen.tsx");
  const chikaPostScreen = read(
    "src/features/chika/screens/chika-post-screen.tsx",
  );
  const searchLayout = read("app/(app)/(tabs)/search/_layout.tsx");
  const searchScreen = read("app/(app)/(tabs)/search/index.tsx");

  assert.match(sharedNav, /id: "search"[\s\S]*?label: "Search"/);
  assert.match(sharedNav, /id: "search"[\s\S]*?platforms: \["mobile"\]/);
  assert.ok(
    sharedNav.indexOf('id: "chika"') < sharedNav.indexOf('id: "search"'),
  );
  assert.ok(
    sharedNav.indexOf('id: "search"') < sharedNav.indexOf('id: "create"'),
  );
  assert.match(sharedNav, /id: "profile"[\s\S]*?platforms: \["web"\]/);
  assert.match(mobileNav, /search: "search"/);
  assert.match(
    mobileNav,
    /APP_BOTTOM_NAV_ITEMS\.filter\(\s*supportsMobile,\s*\)/,
  );
  assert.match(
    mobileNav,
    /role: item\.id === "search" \? \("search" as const\)/,
  );
  assert.match(tabsLayout, /role=\{item\.role\}/);
  assert.match(tabsLayout, /minimizeBehavior: "onScrollDown"/);
  assert.match(createRoute, /CreateScreen/);
  assert.match(createScreen, /MediaComposerSheet/);
  assert.match(createScreen, /Photos and moments/);
  assert.doesNotMatch(
    createScreen,
    /Post in Chika|Publish Chika|ActionSheetIOS/,
  );
  assert.match(chikaScreen, /Post Chika/);
  assert.match(chikaPostScreen, /Publish Chika/);
  const chikaDetailRoute = read("app/(app)/(tabs)/chika/[slug].tsx");
  const chikaDetailScreen = read(
    "src/features/chika/screens/chika-thread-detail-screen.tsx",
  );
  assert.match(chikaDetailRoute, /key=\{slug \?\? "missing-chika-slug"\}/);
  assert.match(chikaDetailScreen, /useGlobalSearchParams/);
  assert.match(
    chikaDetailScreen,
    /safeChikaSlug\(threadQuery\.data\.slug\) === slug/,
  );
  assert.match(
    chikaDetailScreen,
    /<Stack\.Screen options=\{\{ title: "Chika" \}\}/,
  );
  assert.equal(
    fs.existsSync(path.join(root, "app/(app)/(tabs)/create/photos.tsx")),
    false,
  );
  assert.equal(
    fs.existsSync(path.join(root, "app/(app)/(tabs)/create/chika.tsx")),
    false,
  );
  assert.ok(fs.existsSync(path.join(root, "app/(app)/(tabs)/chika/post.tsx")));
  assert.doesNotMatch(nativeHeader, /Stack\.Toolbar/);
  assert.match(nativeHeader, /IOSDrawerButton/);
  assert.match(nativeHeader, /IOSHeaderActions/);
  assert.match(nativeHeader, /USE_ANDROID_NATIVE_HEADER/);
  assert.match(nativeHeader, /headerShown:\s*true/);
  assert.match(nativeHeader, /headerLeft:/);
  assert.match(nativeHeader, /headerRight:/);
  assert.match(nativeHeader, /nativeLargeTitleOptions/);
  assert.match(nativeHeader, /homeNativeLargeTitleOptions/);
  assert.match(nativeHeader, /headerLargeTitle:\s*USE_IOS_NATIVE_HEADER/);
  assert.match(nativeHeader, /HomeCompactHeaderLogo/);
  assert.doesNotMatch(
    nativeHeader,
    /headerTransparent|headerBlurEffect|headerBackground/,
  );
  assert.match(nativeHeader, /headerTitle:/);
  assert.match(nativeHeader, /AndroidHeaderTitle/);
  assert.match(nativeHeader, /HOME_LOGO/);
  assert.match(nativeHeader, /title === "Home"/);
  assert.match(nativeHeader, /name="menu-outline"/);
  assert.match(nativeHeader, /name="notifications-outline"/);
  assert.match(nativeHeader, /name="person-circle-outline"/);
  assert.match(nativeHeader, /\/\(app\)\/\(tabs\)\/\(home\)\/profile/);
  assert.doesNotMatch(
    nativeHeader,
    /headerRightBarButtonItems|headerLeftBarButtonItems|lucide-react-native/,
  );
  assert.match(homeLayout, /homeNativeLargeTitleOptions\(\)/);
  assert.doesNotMatch(homeLayout, /headerTitle:\s*\(\)\s*=>/);
  assert.doesNotMatch(
    searchLayout,
    /headerSearchBarOptions|nativeSearchOptions/,
  );
  assert.match(searchScreen, /@expo\/ui/);
  assert.match(searchScreen, /<Host/);
  assert.match(searchScreen, /<Column/);
  assert.match(searchScreen, /Search is coming soon\./);
  assert.doesNotMatch(searchScreen, /fetch|fphgo|useQuery|TODO|mock|fake/i);
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

test("signed-out users have a public shell entry from auth screens", () => {
  const authScreen = read("src/features/auth/auth-screen.tsx");

  assert.match(authScreen, /Continue without signing in/);
  assert.match(authScreen, /href="\/\(app\)\/\(tabs\)\/\(home\)"/);
  assert.match(authScreen, /AuthView isDismissable=\{false\}/);
});

test("home feed uses shared activity contracts and fetch client", () => {
  const api = read("src/features/home-feed/api/get-home-activity-feed.ts");
  const feedItemRenderer = read(
    "src/features/home-feed/components/mobile-feed-item-renderer.tsx",
  );
  const feedAction = read(
    "src/features/home-feed/hooks/use-feed-action-mutation.ts",
  );
  const hook = read(
    "src/features/home-feed/hooks/use-home-activity-feed-query.ts",
  );
  const mapper = read("src/features/home-feed/lib/activity-card-model.ts");
  const screen = read("src/features/home-feed/screens/home-screen.tsx");

  assert.match(api, /@freediving\.ph\/types/);
  assert.match(api, /ActivityFeedResponse/);
  assert.match(api, /MediaPostLikeState/);
  assert.match(api, /fphgoFetch/);
  assert.match(api, /\/v1\/feed\/activity/);
  assert.match(api, /auth:\s*"optional"/);
  assert.match(api, /\/v1\/feed\/actions/);
  assert.match(api, /auth:\s*"required"/);
  assert.match(
    api,
    /\/v1\/media\/posts\/\$\{encodeURIComponent\(postId\)\}\/likes/,
  );
  assert.doesNotMatch(api, /axios/i);
  assert.doesNotMatch(api, /apps\/web|features\/home-feed\/types/);
  assert.match(hook, /mobileQueryKeys\.feed\.activity/);
  assert.match(mapper, /HomeActivityCardType/);
  assert.match(mapper, /chika_thread_created/);
  assert.match(mapper, /media_post_created/);
  assert.match(mapper, /dive_site_update_added/);
  assert.match(mapper, /event_published/);
  assert.match(mapper, /buddy_intent_created/);
  assert.match(mapper, /unknown/);
  assert.match(mapper, /safeSegment/);
  assert.match(mapper, /safeRemoteImageUrl/);
  assert.match(mapper, /getHomeActivityCardHref/);
  assert.match(mapper, /\/\(app\)\/\(tabs\)\/chika\/\[slug\]/);
  assert.match(mapper, /\/\(app\)\/\(tabs\)\/\(home\)\/events\/\[slug\]/);
  assert.match(mapper, /\/\(app\)\/\(tabs\)\/\(home\)\/explore\/\[slug\]/);
  assert.match(feedItemRenderer, /MobileMediaFeedItem/);
  assert.match(feedItemRenderer, /MobileChikaFeedItem/);
  assert.match(feedItemRenderer, /MobileEventFeedItem/);
  assert.match(feedItemRenderer, /MobileDiveReportFeedItem/);
  assert.match(feedItemRenderer, /MobileBuddySignalFeedItem/);
  assert.match(feedItemRenderer, /onNotInterested/);
  assert.match(feedAction, /setChikaThreadReaction/);
  assert.match(feedAction, /removeChikaThreadReaction/);
  assert.match(feedAction, /likeMediaPost/);
  assert.match(feedAction, /unlikeMediaPost/);
  assert.match(feedAction, /useRequiredToken/);
  assert.match(feedAction, /isLoaded/);
  assert.match(feedAction, /isSignedIn/);
  assert.match(feedAction, /requireActionTarget/);
  assert.match(feedAction, /InfiniteData<ActivityFeedResponse>/);
  assert.match(feedAction, /not_interested/);
  assert.match(screen, /FlatList/);
  assert.doesNotMatch(screen, /@legendapp\/list\/react-native|LegendList/);
  assert.match(screen, /requireSignedIn/);
  assert.match(screen, /canUseFeedActions/);
  assert.match(screen, /Sign in to react to community activity/);
  assert.doesNotMatch(screen, /Zustand|use.*Store/);
});

test("explore uses shared contracts, actions, and safe mobile routes", () => {
  const api = read("src/features/explore/api/explore-api.ts");
  const card = read("src/features/explore/components/explore-site-card.tsx");
  const detail = read(
    "src/features/explore/screens/explore-site-detail-screen.tsx",
  );
  const mutations = read("src/features/explore/hooks/use-explore-mutations.ts");
  const submissionsQuery = read(
    "src/features/explore/hooks/use-my-explore-submissions-query.ts",
  );
  const screen = read("src/features/explore/screens/explore-screen.tsx");
  const format = read("src/features/explore/lib/explore-format.ts");
  const queryKeys = read("src/lib/query/query-keys.ts");

  assert.match(api, /@freediving\.ph\/types/);
  assert.match(api, /ExploreListResponse/);
  assert.match(api, /ExploreSiteDetailResponse/);
  assert.match(api, /ExploreSiteLikeResponse/);
  assert.match(api, /ExploreSiteSaveResponse/);
  assert.match(api, /fphgoFetch/);
  assert.match(api, /\/v1\/explore\/sites/);
  assert.doesNotMatch(api, /axios/i);
  assert.doesNotMatch(api, /features\/explore\/types/);
  assert.match(api, /getExploreSites[\s\S]*auth:\s*"optional"/);
  assert.match(api, /getExploreSiteDetail[\s\S]*auth:\s*"optional"/);
  assert.match(card, /safeSiteSlug/);
  assert.match(card, /actionsDisabled/);
  assert.match(card, /\/\(app\)\/\(tabs\)\/\(home\)\/explore\/\[slug\]/);
  assert.match(detail, /useLocalSearchParams/);
  assert.match(detail, /useExploreSiteLikeMutation/);
  assert.match(detail, /Sign in to like this dive spot\./);
  assert.match(api, /CreateExploreSiteSubmissionRequest/);
  assert.match(api, /\/v1\/explore\/sites\/submit/);
  assert.match(api, /\/likes/);
  assert.match(api, /\/save/);
  assert.match(api, /submitExploreSite[\s\S]*auth:\s*"required"/);
  assert.match(api, /getMyExploreSiteSubmissions[\s\S]*auth:\s*"required"/);
  assert.match(api, /likeExploreSite[\s\S]*auth:\s*"required"/);
  assert.match(api, /saveExploreSite[\s\S]*auth:\s*"required"/);
  assert.match(submissionsQuery, /useAuthenticatedFphgoQuery/);
  assert.match(submissionsQuery, /mySubmissions\(\)/);
  assert.match(mutations, /isLoaded/);
  assert.match(mutations, /isSignedIn/);
  assert.match(mutations, /Checking your session\. Try again in a moment\./);
  assert.match(mutations, /requireSiteId/);
  assert.match(mutations, /trim\(\)/);
  assert.match(mutations, /requireSiteSubmissionPayload/);
  assert.match(mutations, /Enter valid dive spot coordinates\./);
  assert.match(mutations, /ExploreSiteSubmissionListResponse/);
  assert.match(mutations, /setQueriesData<ExploreListResponse>/);
  assert.match(mutations, /setQueriesData<ExploreSiteDetailResponse>/);
  assert.match(mutations, /mySubmissions\(\)/);
  assert.match(screen, /validateSubmission/);
  assert.match(screen, /Latitude must be between -90 and 90/);
  assert.match(screen, /Pending review/);
  assert.match(screen, /Sign in to save spots/);
  assert.match(queryKeys, /mySubmissions/);
  assert.doesNotMatch(
    screen,
    /expo-location|react-native-maps|MapView|cluster|custom marker|gps/i,
  );
  assert.doesNotMatch(
    detail,
    /expo-location|react-native-maps|MapView|cluster|custom marker|gps/i,
  );
  assert.ok(format.includes('includes("/")'));
});

test("media composer uses real upload contracts and native picker guards", () => {
  const api = read("src/features/media/api/media-api.ts");
  const mutations = read("src/features/media/hooks/use-media-mutations.ts");
  const guards = read("src/features/media/lib/media-upload-guards.ts");
  const composer = read(
    "src/features/media/components/media-composer-sheet.tsx",
  );
  const createScreen = read("src/features/create/screens/create-screen.tsx");

  assert.match(api, /@freediving\.ph\/types/);
  assert.match(api, /MediaUploadResponse/);
  assert.match(api, /CreateMediaPostRequest/);
  assert.match(api, /MomentUploadIntentResponse/);
  assert.match(api, /\/v1\/media\/upload-multiple/);
  assert.match(api, /\/v1\/media\/posts/);
  assert.match(api, /\/v1\/media\/moments\/upload-intents/);
  assert.match(api, /\/complete/);
  assert.match(api, /auth:\s*"required"/);
  assert.match(api, /fetch\(uploadUrl/);
  assert.doesNotMatch(api, /axios/i);
  assert.match(mutations, /uploadMediaFiles/);
  assert.match(mutations, /createMediaPost/);
  assert.match(mutations, /createMomentUploadIntent/);
  assert.match(mutations, /uploadMomentToDirectUrl/);
  assert.match(mutations, /completeMomentUpload/);
  assert.match(mutations, /getRequiredToken/);
  assert.match(guards, /MEDIA_UPLOAD_LIMIT_BYTES = 10 \* 1024 \* 1024/);
  assert.match(guards, /MOMENT_UPLOAD_LIMIT_BYTES = 200 \* 1024 \* 1024/);
  assert.match(guards, /MOMENT_MAX_DURATION_SECONDS = 30/);
  assert.match(guards, /validatePhotoAsset/);
  assert.match(guards, /validateMomentAsset/);
  assert.match(composer, /expo-image-picker/);
  assert.match(composer, /requestMediaLibraryPermissionsAsync/);
  assert.match(composer, /launchImageLibraryAsync/);
  assert.match(composer, /Choose photos/);
  assert.match(composer, /Choose Moment/);
  assert.match(composer, /Share photos/);
  assert.match(composer, /Upload Moment/);
  assert.match(createScreen, /MediaComposerSheet/);
  assert.doesNotMatch(composer, /fake|mock|deferred/i);
  assert.doesNotMatch(api, /fake|mock|placeholder/i);
});

test("chika uses shared contracts, nested replies, and vote actions", () => {
  const api = read("src/features/chika/api/chika-api.ts");
  const card = read("src/features/chika/components/chika-thread-card.tsx");
  const detail = read(
    "src/features/chika/screens/chika-thread-detail-screen.tsx",
  );
  const postScreen = read("src/features/chika/screens/chika-post-screen.tsx");
  const mutations = read("src/features/chika/hooks/use-chika-mutations.ts");
  const format = read("src/features/chika/lib/chika-format.ts");
  const queryKeys = read("src/lib/query/query-keys.ts");

  assert.match(api, /@freediving\.ph\/types/);
  assert.match(api, /ChikaThreadListResponse/);
  assert.match(api, /ChikaThreadResponse/);
  assert.match(api, /ChikaCommentListResponse/);
  assert.match(api, /CreateChikaThreadRequest/);
  assert.match(api, /CreateChikaCommentRequest/);
  assert.match(api, /SetChikaReactionRequest/);
  assert.match(api, /fphgoFetch/);
  assert.match(api, /\/v1\/chika\/threads/);
  assert.doesNotMatch(api, /axios/i);
  assert.doesNotMatch(api, /features\/chika\/types/);
  assert.match(api, /getChikaThreads[\s\S]*auth:\s*"optional"/);
  assert.match(api, /getChikaThreadDetail[\s\S]*auth:\s*"optional"/);
  assert.match(api, /getChikaComments[\s\S]*auth:\s*"optional"/);
  assert.match(api, /ChikaCommentReactionResponse/);
  assert.match(api, /createChikaThread/);
  assert.match(api, /createChikaComment/);
  assert.match(
    api,
    /\/v1\/chika\/comments\/\$\{encodeURIComponent\(commentId\)\}\/reactions/,
  );
  assert.match(api, /\/reactions/);
  assert.match(api, /createChikaThread[\s\S]*auth:\s*"required"/);
  assert.match(api, /createChikaComment[\s\S]*auth:\s*"required"/);
  assert.match(api, /setChikaThreadReaction[\s\S]*auth:\s*"required"/);
  assert.match(api, /setChikaThreadReaction[\s\S]*idempotencyKey/);
  assert.match(api, /removeChikaThreadReaction[\s\S]*auth:\s*"required"/);
  assert.match(api, /removeChikaThreadReaction[\s\S]*method:\s*"DELETE"/);
  assert.match(api, /removeChikaThreadReaction[\s\S]*idempotencyKey/);
  assert.match(api, /setChikaCommentReaction[\s\S]*auth:\s*"required"/);
  assert.match(api, /setChikaCommentReaction[\s\S]*idempotencyKey/);
  assert.match(api, /removeChikaCommentReaction[\s\S]*auth:\s*"required"/);
  assert.match(api, /removeChikaCommentReaction[\s\S]*method:\s*"DELETE"/);
  assert.match(api, /removeChikaCommentReaction[\s\S]*idempotencyKey/);
  assert.match(card, /safeChikaSlug/);
  assert.match(format, /authorDisplayName/);
  assert.match(card, /\/\(app\)\/\(tabs\)\/chika\/\[slug\]/);
  assert.match(detail, /useLocalSearchParams/);
  assert.match(detail, /parentCommentId/);
  assert.match(detail, /useSetChikaCommentReactionMutation/);
  assert.match(detail, /requireSignedIn/);
  assert.match(detail, /shouldQueueFailedMutation/);
  assert.match(detail, /canUseChikaActions/);
  assert.match(detail, /chikaActionErrorMessage/);
  assert.match(detail, /Sign in to vote in Chika\./);
  assert.match(detail, /Sign in to reply in Chika\./);
  assert.match(detail, /onReact=\{\s*canUseChikaActions/);
  assert.match(
    detail,
    /onReply=\{canUseChikaActions \? setReplyTo : undefined\}/,
  );
  assert.match(detail, /actionsDisabled/);
  assert.match(detail, /shouldFallbackToLocalChikaState/);
  assert.match(detail, /error instanceof TypeError/);
  assert.match(postScreen, /requireSignedIn/);
  assert.match(postScreen, /Sign in to post Chika/);
  assert.match(postScreen, /Categories unavailable/);
  assert.match(postScreen, /Could not publish in Chika\. Saved as draft\./);
  assert.match(mutations, /requireMutationTarget/);
  assert.match(mutations, /Checking your session\. Try again in a moment\./);
  assert.match(mutations, /Sign in to continue\./);
  assert.match(mutations, /chikaThreadListKey/);
  assert.match(mutations, /threadCommentsRoot\(threadId\)/);
  assert.match(mutations, /patchThreadReaction/);
  assert.match(mutations, /patchCommentReactionState/);
  assert.match(mutations, /nextVoteCount/);
  assert.match(mutations, /makeOnlineMutationKey/);
  assert.match(mutations, /makeIdempotencyKey/);
  assert.match(mutations, /getMobileAuthTokenSafe/);
  assert.match(mutations, /onMutate/);
  assert.match(
    mutations,
    /removeChikaThreadReaction\(targetThreadId, token, idempotencyKey\)/,
  );
  assert.match(
    mutations,
    /removeChikaCommentReaction\(targetCommentId, token, idempotencyKey\)/,
  );
  assert.doesNotMatch(mutations, /limit:\s*50/);
  assert.match(mutations, /threadDetail\(slug\)/);
  assert.match(mutations, /setQueriesData<ChikaCommentListResponse>/);
  assert.match(queryKeys, /threadCommentsRoot/);
  assert.doesNotMatch(detail, /websocket|realtime/i);
  assert.doesNotMatch(detail, /moderation|admin|report|block/i);
  assert.ok(format.includes('includes("/")'));

  const screen = read("src/features/chika/screens/chika-screen.tsx");
  const commentCard = read(
    "src/features/chika/components/chika-comment-card.tsx",
  );
  assert.match(screen, /canPostChika/);
  assert.match(screen, /Sign in to post Chika/);
  assert.match(commentCard, /showActions/);
  assert.match(commentCard, /Boolean\(onReact \|\| onReply\)/);
  assert.match(detail, /canQueueFailedMutation\(error\)/);
  assert.match(detail, /Could not post reply\. Saved as draft\./);
  assert.match(detail, /Could not post reply\./);
});

test("events uses shared contracts and member event actions", () => {
  const api = read("src/features/events/api/events-api.ts");
  const card = read("src/features/events/components/event-card.tsx");
  const detail = read("src/features/events/screens/event-detail-screen.tsx");
  const format = read("src/features/events/lib/event-format.ts");
  const mutations = read("src/features/events/hooks/use-event-mutations.ts");
  const postsQuery = read("src/features/events/hooks/use-event-posts-query.ts");
  const queryKeys = read("src/lib/query/query-keys.ts");

  assert.match(api, /@freediving\.ph\/types/);
  assert.match(api, /EventListResponse/);
  assert.match(api, /EventDetailResponse/);
  assert.match(api, /EventPostResponse/);
  assert.match(api, /EventPostsResponse/);
  assert.match(api, /JoinEventResponse/);
  assert.match(api, /EventFilters/);
  assert.match(api, /fphgoFetch/);
  assert.match(api, /\/v1\/events/);
  assert.match(api, /status/);
  assert.doesNotMatch(api, /axios/i);
  assert.doesNotMatch(api, /features\/events\/types/);
  assert.match(api, /getEvents[\s\S]*auth:\s*"optional"/);
  assert.match(api, /getEventDetail[\s\S]*auth:\s*"optional"/);
  assert.match(api, /getEventPosts[\s\S]*auth:\s*"optional"/);
  assert.match(api, /joinEvent[\s\S]*auth:\s*"required"/);
  assert.match(api, /leaveEvent[\s\S]*auth:\s*"required"/);
  assert.match(api, /setEventInterest[\s\S]*auth:\s*"required"/);
  assert.match(api, /removeEventInterest[\s\S]*auth:\s*"required"/);
  assert.match(api, /createEventPost[\s\S]*auth:\s*"required"/);
  assert.match(api, /updates\/.*reactions\/fish[\s\S]*auth:\s*"required"/);
  assert.match(card, /safeEventSlug/);
  assert.match(card, /\/\(app\)\/\(tabs\)\/\(home\)\/events\/\[slug\]/);
  assert.match(detail, /useLocalSearchParams/);
  assert.match(detail, /useEventAttendanceMutation/);
  assert.match(detail, /canToggleInterest/);
  assert.match(detail, /event\.status === "published"/);
  assert.match(detail, /viewerParticipation\?\.role !== "organizer"/);
  assert.match(detail, /Event unavailable/);
  assert.match(detail, /Request to join/);
  assert.match(detail, /Marked interested/);
  assert.match(detail, /Post update/);
  assert.match(detail, /Discard draft/);
  assert.match(detail, /Could not update fish reaction/);
  assert.doesNotMatch(
    detail,
    /booking|check-in|check in|receipt|Payment instructions|admin/i,
  );
  assert.match(mutations, /requireEventId/);
  assert.match(mutations, /isLoaded/);
  assert.match(mutations, /isSignedIn/);
  assert.match(mutations, /Checking your session\. Try again in a moment\./);
  assert.match(mutations, /requireEventPostId/);
  assert.match(mutations, /requireEventPostPayload/);
  assert.match(mutations, /Write an update before posting\./);
  assert.match(mutations, /setQueryData<EventPostsResponse>/);
  assert.match(mutations, /mobileQueryKeys\.events\.posts\(eventId\)/);
  assert.match(postsQuery, /useQuery/);
  assert.doesNotMatch(postsQuery, /useAuthenticatedFphgoQuery/);
  assert.match(queryKeys, /posts:\s*\(eventId:\s*string\)/);
  assert.ok(format.includes('includes("/")'));
});

test("profiles use shared contracts, auth gating, edit, posts, and diving", () => {
  const api = read("src/features/profiles/api/profiles-api.ts");
  const myHook = read("src/features/profiles/hooks/use-my-profile-query.ts");
  const publicHook = read(
    "src/features/profiles/hooks/use-public-profile-query.ts",
  );
  const ownScreen = read("src/features/profiles/screens/profile-screen.tsx");
  const publicScreen = read(
    "src/features/profiles/screens/public-profile-screen.tsx",
  );
  const activityHook = read(
    "src/features/profiles/hooks/use-profile-activity-query.ts",
  );
  const mutationHook = read(
    "src/features/profiles/hooks/use-profile-mutations.ts",
  );
  const divingSection = read(
    "src/features/profiles/components/profile-diving-section.tsx",
  );
  const postCard = read(
    "src/features/profiles/components/profile-post-card.tsx",
  );
  const format = read("src/features/profiles/lib/profile-format.ts");

  assert.match(api, /@freediving\.ph\/types/);
  assert.match(api, /ProfileResponse/);
  assert.match(api, /PublicProfileResponse/);
  assert.match(api, /ProfilePostsResponse/);
  assert.match(api, /fphgoFetch/);
  assert.match(api, /\/v1\/me\/profile/);
  assert.match(api, /\/v1\/profiles\/public/);
  assert.match(api, /auth:\s*"required"/);
  assert.match(api, /auth:\s*"none"/);
  assert.doesNotMatch(api, /axios/i);
  assert.doesNotMatch(
    api,
    /features\/profile\/types|features\/profiles\/types/,
  );
  assert.match(api, /UpdateMyProfileRequest/);
  assert.match(api, /method:\s*"PATCH"/);
  assert.match(api, /\/posts/);
  assert.match(api, /response\) => response\.items/);
  assert.match(api, /\/diving/);
  assert.match(myHook, /useAuthenticatedFphgoQuery/);
  assert.doesNotMatch(publicHook, /useAuthenticatedFphgoQuery/);
  assert.match(publicHook, /useQuery/);
  assert.match(publicHook, /safeProfileUsername/);
  assert.match(activityHook, /safeProfileUsername/);
  assert.match(
    mutationHook,
    /setQueryData\(mobileQueryKeys\.profile\.me\(\), response\)/,
  );
  assert.match(mutationHook, /isLoaded/);
  assert.match(mutationHook, /isSignedIn/);
  assert.match(mutationHook, /Checking your session\. Try again in a moment\./);
  assert.match(mutationHook, /PublicProfileResponse/);
  assert.match(mutationHook, /profile\.public\(response\.profile\.username\)/);
  assert.match(mutationHook, /setQueryData<PublicProfileResponse>/);
  assert.match(ownScreen, /\/\(app\)\/\(tabs\)\/\(home\)\/profile\/settings/);
  assert.match(publicScreen, /useLocalSearchParams/);
  assert.match(
    publicScreen,
    /Stack\.Screen options=\{\{ title: "Profile unavailable" \}\}/,
  );
  assert.match(ownScreen, /Edit profile/);
  assert.match(ownScreen, /ProfilePostCard/);
  assert.match(ownScreen, /ProfileDivingSection/);
  assert.match(ownScreen, /Could not update profile\. Saved as draft\./);
  assert.match(ownScreen, /Discard draft/);
  assert.match(publicScreen, /ProfilePostCard/);
  assert.match(publicScreen, /ProfileDivingSection/);
  assert.match(postCard, /safeImageUrl/);
  assert.match(postCard, /\/\(app\)\/\(tabs\)\/\(home\)\/explore\/\[slug\]/);
  assert.match(divingSection, /diveSiteSlug/);
  assert.match(divingSection, /Diving activity is unavailable right now/);
  assert.match(
    divingSection,
    /Only diving details this profile can share are shown/,
  );
  assert.doesNotMatch(
    ownScreen,
    /upload|followAction|sendMessage|SQLite|Drizzle/i,
  );
  assert.doesNotMatch(
    publicScreen,
    /upload|editProfile|followAction|sendMessage|report|block/i,
  );
  assert.doesNotMatch(postCard, /upload|sendMessage|report|block/i);
  assert.ok(format.includes('includes("/")'));
  assert.match(format, /safeImageUrl/);
});

test("notifications use shared contracts, auth gating, preferences, and safe push routes", () => {
  const api = read("src/features/notifications/api/notifications-api.ts");
  const hook = read(
    "src/features/notifications/hooks/use-notifications-query.ts",
  );
  const settingsHook = read(
    "src/features/notifications/hooks/use-notification-settings-query.ts",
  );
  const settingsMutation = read(
    "src/features/notifications/hooks/use-notification-settings-mutation.ts",
  );
  const pushMutation = read(
    "src/features/notifications/hooks/use-register-push-device-mutation.ts",
  );
  const card = read(
    "src/features/notifications/components/notification-card.tsx",
  );
  const screen = read(
    "src/features/notifications/screens/notifications-screen.tsx",
  );
  const format = read("src/features/notifications/lib/notification-format.ts");

  assert.match(api, /@freediving\.ph\/types/);
  assert.match(api, /ListNotificationsResponse/);
  assert.match(api, /NotificationFilters/);
  assert.match(api, /RegisterPushDeviceRequest/);
  assert.match(api, /UpdateNotificationSettingsRequest/);
  assert.match(api, /fphgoFetch/);
  assert.match(api, /\/v1\/notifications/);
  assert.match(api, /\/v1\/notifications\/devices/);
  assert.match(api, /\/v1\/notifications\/preferences/);
  assert.match(api, /auth:\s*"required"/);
  assert.doesNotMatch(api, /axios/i);
  assert.doesNotMatch(api, /features\/notifications\/types/);
  assert.match(api, /method:\s*"POST"/);
  assert.match(api, /method:\s*"PUT"/);
  assert.match(api, /method:\s*"DELETE"/);
  assert.match(hook, /useAuthenticatedFphgoQuery/);
  assert.match(hook, /mobileQueryKeys\.notifications\.list/);
  assert.match(settingsHook, /mobileQueryKeys\.notifications\.settings/);
  assert.match(settingsMutation, /updateNotificationSettings/);
  assert.match(settingsMutation, /isLoaded/);
  assert.match(settingsMutation, /isSignedIn/);
  assert.match(pushMutation, /registerPushDevice/);
  assert.match(pushMutation, /getToken/);
  assert.match(pushMutation, /isLoaded/);
  assert.match(pushMutation, /isSignedIn/);
  assert.match(pushMutation, /Authentication required/);
  assert.match(card, /notificationHref/);
  assert.match(format, /resolveFphLink/);
  assert.match(format, /resolution\.type === "native"/);
  assert.match(format, /notificationsFallbackHref/);
  assert.match(format, /return undefined/);
  assert.match(screen, /MobileLoadingState/);
  assert.match(screen, /MobileEmptyState/);
  assert.match(screen, /MobileErrorState/);
  assert.match(screen, /Enable push/);
  assert.match(screen, /Sign in to enable notifications/);
  assert.match(screen, /Real iPhone push delivery still needs App Store setup/);
  assert.match(screen, /Dive condition alerts/);
  assert.doesNotMatch(screen, /markAsRead|markAllAsRead|websocket|realtime/i);
});

test("Phase 4 location and push helpers stay foreground-only and user initiated", () => {
  const pkg = JSON.parse(read("package.json"));
  const appConfig = read("app.json");
  const push = read("src/features/notifications/lib/push-notifications.ts");
  const listener = read(
    "src/features/notifications/components/push-notification-route-listener.tsx",
  );
  const location = read("src/features/location/lib/foreground-location.ts");
  const screen = read(
    "src/features/notifications/screens/notifications-screen.tsx",
  );

  assert.ok(pkg.dependencies["expo-notifications"]);
  assert.ok(pkg.dependencies["expo-location"]);
  assert.match(appConfig, /locationWhenInUsePermission/);
  assert.doesNotMatch(appConfig, /locationAlways|UIBackgroundModes/i);
  assert.match(push, /requestPermissionsAsync/);
  assert.match(push, /getExpoPushTokenAsync/);
  assert.match(push, /Device\.isDevice/);
  assert.match(push, /Turn them on in system settings/);
  assert.doesNotMatch(
    push,
    /getToken|registerPushDevice\(|setInterval|Background|APNs|TestFlight/i,
  );
  assert.match(listener, /addNotificationResponseReceivedListener/);
  assert.match(listener, /notificationsFallbackHref/);
  assert.match(location, /requestForegroundPermissionsAsync/);
  assert.match(location, /getCurrentPositionAsync/);
  assert.doesNotMatch(
    location,
    /requestBackgroundPermissionsAsync|watchPositionAsync|startLocationUpdatesAsync/i,
  );
  assert.match(screen, /Use my current area/);
  assert.match(screen, /diveConditionCoarseArea/);
  assert.match(screen, /requestForegroundCoarseLocation/);
  assert.doesNotMatch(screen, /continuous tracking/i);
  assert.doesNotMatch(screen, /requestBackgroundPermissions|watchPosition/i);
});

test("buddies use shared public and member intent contracts", () => {
  const api = read("src/features/buddies/api/buddies-api.ts");
  const hook = read("src/features/buddies/hooks/use-buddy-finder-query.ts");
  const mutations = read("src/features/buddies/hooks/use-buddy-mutations.ts");
  const card = read("src/features/buddies/components/buddy-intent-card.tsx");
  const screen = read("src/features/buddies/screens/buddies-screen.tsx");
  const format = read("src/features/buddies/lib/buddy-format.ts");
  const messageApi = read("src/features/messages/api/messages-api.ts");
  const queryKeys = read("src/lib/query/query-keys.ts");

  assert.match(api, /@freediving\.ph\/types/);
  assert.match(api, /BuddyFinderPreviewResponse/);
  assert.match(api, /BuddyFinderListResponse/);
  assert.match(api, /fphgoFetch/);
  assert.match(api, /\/v1\/buddy-finder\/preview/);
  assert.match(api, /\/v1\/buddy-finder\/intents/);
  assert.match(api, /auth:\s*"none"/);
  assert.match(api, /auth:\s*"required"/);
  assert.doesNotMatch(api, /axios/i);
  assert.doesNotMatch(
    api,
    /features\/buddies\/types|features\/buddy-finder\/types/,
  );
  assert.match(api, /CreateBuddyFinderIntentRequest/);
  assert.match(api, /createBuddyFinderIntent/);
  assert.match(api, /deleteBuddyFinderIntent/);
  assert.match(api, /getBuddyFinderMessageEntry/);
  assert.match(api, /auth:\s*"required"/);
  assert.doesNotMatch(
    api,
    /method:\s*"PATCH"|method:\s*"PUT"|updateBuddyFinderIntent/,
  );
  assert.match(hook, /useAuthenticatedFphgoQuery/);
  assert.match(hook, /mobileQueryKeys\.buddies\.preview/);
  assert.match(screen, /canUseMemberBuddies/);
  assert.match(screen, /Sign in to post a buddy request\./);
  assert.match(screen, /canUseMemberBuddies\s*\?\s*\(memberIntentsQuery\.data/);
  assert.doesNotMatch(
    screen,
    /memberIntentsQuery\.data\?\.items\s*\?\?\s*buddiesQuery\.data\?\.items/,
  );
  assert.match(screen, /listError/);
  assert.match(screen, /memberIntentsQuery\.refetch/);
  assert.match(screen, /canUseMemberBuddies &&\s*"authorAppUserId" in intent/);
  assert.match(mutations, /getRequiredToken/);
  assert.match(mutations, /isLoaded/);
  assert.match(mutations, /isSignedIn/);
  assert.match(mutations, /Checking your session\. Try again in a moment\./);
  assert.match(mutations, /requireIntentId/);
  assert.match(mutations, /trim\(\)/);
  assert.match(mutations, /openDirectMessageThread/);
  assert.match(mutations, /mobileQueryKeys\.buddies\.intentLists/);
  assert.match(mutations, /mobileQueryKeys\.buddies\.previews/);
  assert.match(messageApi, /\/v1\/messages\/threads\/direct/);
  assert.match(queryKeys, /previews/);
  assert.match(queryKeys, /intentLists/);
  assert.match(card, /BuddyFinderPreviewIntent/);
  assert.match(card, /BuddyFinderIntent/);
  assert.match(card, /profileHref/);
  assert.match(card, /isMessagePending/);
  assert.match(card, /View profile/);
  assert.match(card, /To change this post, close it and create a new one/);
  assert.match(card, /Close intent/);
  assert.ok(format.includes('includes("/")'));
  assert.match(screen, /MobileLoadingState/);
  assert.match(screen, /MobileEmptyState/);
  assert.match(screen, /MobileErrorState/);
  assert.match(screen, /Create intent/);
  assert.match(screen, /Discard draft/);
  assert.match(screen, /profileHrefForUsername/);
  assert.match(screen, /\/\(app\)\/\(tabs\)\/messages\/\[threadId\]/);
  assert.match(screen, /specific_date/);
  assert.doesNotMatch(screen, /gps|location/i);
});

test("messages and groups expose member-safe Phase 2 routes", () => {
  const messagesApi = read("src/features/messages/api/messages-api.ts");
  const messagesQueries = read(
    "src/features/messages/hooks/use-message-queries.ts",
  );
  const messagesMutations = read(
    "src/features/messages/hooks/use-message-mutations.ts",
  );
  const messagesScreen = read(
    "src/features/messages/screens/messages-screen.tsx",
  );
  const messageThreadScreen = read(
    "src/features/messages/screens/message-thread-screen.tsx",
  );
  const queryKeys = read("src/lib/query/query-keys.ts");
  const groupsApi = read("src/features/groups/api/groups-api.ts");
  const groupQueries = read(
    "src/features/groups/hooks/use-group-member-queries.ts",
  );
  const groupMutations = read(
    "src/features/groups/hooks/use-group-mutations.ts",
  );
  const groupsScreen = read("src/features/groups/screens/groups-screen.tsx");
  const groupDetailScreen = read(
    "src/features/groups/screens/group-detail-screen.tsx",
  );

  assert.match(messagesApi, /@freediving\.ph\/types/);
  assert.match(messagesApi, /\/v1\/messages\/threads/);
  assert.match(messagesApi, /\/v1\/messages\/unread-count/);
  assert.match(messagesApi, /MessagingSendMessageRequest/);
  assert.match(messagesApi, /MessagingMarkReadRequest/);
  assert.match(messagesApi, /sendThreadMessage/);
  assert.match(messagesApi, /acceptThreadRequest/);
  assert.match(messagesApi, /declineThreadRequest/);
  assert.match(messagesApi, /markThreadRead/);
  assert.match(messagesApi, /auth:\s*"required"/);
  assert.match(messagesQueries, /useAuthenticatedFphgoQuery/);
  assert.match(messagesMutations, /getRequiredToken/);
  assert.match(messagesMutations, /isLoaded/);
  assert.match(messagesMutations, /isSignedIn/);
  assert.match(messagesMutations, /requireThreadId/);
  assert.match(messagesMutations, /requireMessageId/);
  assert.match(messagesMutations, /requireMessageBody/);
  assert.match(messagesMutations, /mobileQueryKeys\.messages\.threadLists/);
  assert.match(messagesMutations, /mobileQueryKeys\.messages\.unreadCount/);
  assert.match(queryKeys, /threadLists/);
  assert.match(queryKeys, /threadDetails/);
  assert.match(messagesScreen, /requests/);
  assert.match(messagesScreen, /transactions/);
  assert.match(
    messagesScreen,
    /Booking and transaction conversations will appear here/,
  );
  assert.match(messageThreadScreen, /canResolveRequest/);
  assert.match(messageThreadScreen, /Send/);
  assert.match(messageThreadScreen, /lastMarkedReadRef/);
  assert.match(messageThreadScreen, /Could not send message/);
  assert.match(messageThreadScreen, /Conversation unavailable/);
  assert.doesNotMatch(messageThreadScreen, /websocket|realtime|push/i);
  assert.doesNotMatch(messagesApi, /axios/i);
  assert.doesNotMatch(messagesApi, /apps\/web|features\/messages\/types/);
  assert.doesNotMatch(messagesScreen, /endpoint|DTO|payload|debug|code-wise/i);
  assert.doesNotMatch(
    messageThreadScreen,
    /endpoint|DTO|payload|debug|code-wise/i,
  );

  assert.match(groupsApi, /@freediving\.ph\/types/);
  assert.match(groupsApi, /GroupListResponse/);
  assert.match(groupsApi, /GroupDetailResponse/);
  assert.match(groupsApi, /GroupMembersResponse/);
  assert.match(groupsApi, /GroupPostsResponse/);
  assert.match(groupsApi, /GroupMembershipResponse/);
  assert.match(groupsApi, /CreateGroupPostResponse/);
  assert.doesNotMatch(groupsApi, /export type GroupListResponse/);
  assert.doesNotMatch(groupsApi, /export type GroupDetailResponse/);
  assert.doesNotMatch(groupsApi, /export type GroupMembersResponse/);
  assert.doesNotMatch(groupsApi, /export type GroupPostsResponse/);
  assert.match(groupsApi, /\/v1\/groups/);
  assert.match(groupsApi, /joinGroup/);
  assert.match(groupsApi, /leaveGroup/);
  assert.match(groupsApi, /acceptGroupInvite/);
  assert.match(groupsApi, /rejectGroupInvite/);
  assert.match(groupsApi, /createGroupPost/);
  assert.match(groupsApi, /auth:\s*"optional"/);
  assert.match(groupsApi, /auth:\s*"required"/);
  assert.doesNotMatch(groupsApi, /axios/i);
  assert.doesNotMatch(groupsApi, /apps\/web|features\/groups\/types/);
  assert.doesNotMatch(groupsApi, /archiveGroup|inviteMember|updateGroup/);
  assert.match(groupQueries, /useQuery/);
  assert.doesNotMatch(groupQueries, /useAuthenticatedFphgoQuery/);
  assert.match(groupMutations, /getRequiredToken/);
  assert.match(groupMutations, /isLoaded/);
  assert.match(groupMutations, /isSignedIn/);
  assert.match(
    groupMutations,
    /Checking your session\. Try again in a moment\./,
  );
  assert.match(groupMutations, /requireGroupId/);
  assert.match(groupMutations, /trim\(\)/);
  assert.match(groupMutations, /requireGroupPostPayload/);
  assert.match(groupMutations, /Write something before posting\./);
  assert.match(groupMutations, /mobileQueryKeys\.groups\.lists/);
  assert.match(groupMutations, /mobileQueryKeys\.groups\.posts/);
  assert.match(groupsScreen, /safeSlug/);
  assert.match(groupDetailScreen, /Group unavailable/);
  assert.match(groupDetailScreen, /Join group/);
  assert.match(groupDetailScreen, /Accept invite/);
  assert.match(groupDetailScreen, /Decline/);
  assert.match(groupDetailScreen, /Post to group/);
  assert.match(groupDetailScreen, /Title, optional/);
  assert.match(groupDetailScreen, /Members unavailable/);
  assert.match(groupDetailScreen, /!postsQuery\.error/);
  assert.doesNotMatch(groupDetailScreen, /admin|moderation|archive/i);
});

test("local Phase 3 storage is bounded to drafts and sync outbox", () => {
  const database = read("src/local/db/database.ts");
  const types = read("src/local/db/types.ts");
  const draftRepo = read("src/local/drafts/drafts-repository.ts");
  const outboxRepo = read("src/local/outbox/outbox-repository.ts");
  const supported = read("src/local/outbox/supported-operations.ts");

  assert.match(database, /expo-sqlite/);
  assert.match(database, /CREATE TABLE IF NOT EXISTS local_drafts/);
  assert.match(database, /CREATE TABLE IF NOT EXISTS sync_outbox/);
  assert.match(database, /CREATE TABLE IF NOT EXISTS local_media_queue/);
  assert.match(database, /PRAGMA user_version/);
  assert.doesNotMatch(database, /server|profile_posts|events|messages/i);
  assert.match(types, /LocalDraftStatus/);
  assert.match(types, /SyncOutboxStatus/);
  assert.match(types, /idempotencyKey/);
  assert.match(types, /OFFLINE_OPERATION_CLASSIFICATION/);
  assert.match(types, /message_send:\s*"online_only"/);
  assert.match(types, /event_join_leave:\s*"online_only"/);
  assert.match(types, /explore_site_submit:\s*"online_only"/);
  assert.match(types, /notification_mark_read:\s*"unsupported"/);
  assert.match(types, /chika_thread_create:\s*"draft_only"/);
  assert.match(types, /chika_comment_create:\s*"draft_only"/);
  assert.match(types, /buddy_intent_create:\s*"draft_only"/);
  assert.match(types, /profile_edit_update:\s*"draft_only"/);
  assert.match(types, /event_post_create:\s*"draft_only"/);
  assert.match(types, /group_post_create:\s*"draft_only"/);
  assert.match(types, /chika_thread_reaction:\s*"queue_safe"/);
  assert.match(types, /chika_comment_reaction:\s*"queue_safe"/);
  assert.match(types, /event_interest:\s*"queue_safe"/);
  assert.match(types, /event_post_fish:\s*"queue_safe"/);
  assert.match(types, /explore_site_like:\s*"queue_safe"/);
  assert.match(types, /explore_site_save:\s*"queue_safe"/);
  assert.match(draftRepo, /saveLocalDraft/);
  assert.match(draftRepo, /getLatestLocalDraft/);
  assert.match(draftRepo, /discardLocalDraft/);
  assert.match(outboxRepo, /createOutboxItem/);
  assert.match(outboxRepo, /makeIdempotencyKey/);
  assert.match(outboxRepo, /assertQueueablePayload/);
  assert.match(outboxRepo, /markOutboxSynced/);
  assert.match(outboxRepo, /markOutboxFailed/);
  assert.match(supported, /QUEUEABLE_OPERATION_TYPES/);
  assert.match(supported, /QUEUEABLE_OPERATION_SAFETY/);
  assert.match(supported, /server_state_idempotent/);
  assert.match(supported, /requiredStringKeys/);
  assert.match(supported, /requiredBooleanKeys/);
  assert.match(supported, /shouldQueueFailedMutation/);
  assert.match(supported, /error\.status >= 500/);
  assert.match(supported, /error\.status === 429/);
  assert.doesNotMatch(supported, /error\.status === 400/);
  assert.doesNotMatch(
    supported,
    /message_send|event_join_leave|payment|booking|chika_thread_create|chika_comment_create|buddy_intent_create|profile_edit_update|event_post_create|group_post_create/i,
  );
});

test("sync runner is manual, idempotent, and server-response gated", () => {
  const syncRunner = read("src/local/sync/sync-runner.ts");
  const outboxHook = read("src/local/outbox/use-outbox.ts");
  const client = read("src/lib/api/fphgo-client.ts");
  const createScreen = read("src/features/create/screens/create-screen.tsx");
  const buddiesScreen = read("src/features/buddies/screens/buddies-screen.tsx");
  const chikaDetail = read(
    "src/features/chika/screens/chika-thread-detail-screen.tsx",
  );
  const eventsDetail = read(
    "src/features/events/screens/event-detail-screen.tsx",
  );
  const exploreScreen = read("src/features/explore/screens/explore-screen.tsx");

  assert.match(client, /Idempotency-Key/);
  assert.match(syncRunner, /runSyncOutbox/);
  assert.match(syncRunner, /idempotencyKey:\s*item\.idempotencyKey/);
  assert.match(
    syncRunner,
    /assertQueueablePayload\(item\.operationType, item\.payload\)/,
  );
  assert.match(syncRunner, /markOutboxSynced/);
  assert.match(syncRunner, /markOutboxFailed/);
  assert.match(syncRunner, /break/);
  assert.doesNotMatch(syncRunner, /setInterval|Background|TaskManager|push/i);
  assert.match(outboxHook, /syncNow/);
  assert.match(outboxHook, /Waiting to sync/);
  assert.match(outboxHook, /Could not sync\. Try again\./);
  assert.match(createScreen, /Saved as draft/);
  assert.doesNotMatch(
    syncRunner,
    /chika_thread_create|chika_comment_create|buddy_intent_create|profile_edit_update|event_post_create|group_post_create/,
  );
  assert.doesNotMatch(createScreen, /chika_thread_create/);
  assert.doesNotMatch(buddiesScreen, /buddy_intent_create/);
  assert.doesNotMatch(chikaDetail, /chika_comment_create/);
  assert.match(chikaDetail, /shouldQueueFailedMutation/);
  assert.match(eventsDetail, /shouldQueueFailedMutation/);
  assert.match(exploreScreen, /shouldQueueFailedMutation/);
  assert.match(exploreScreen, /outbox\.message === "Synced"/);
  assert.match(exploreScreen, /setActionMessage\(null\)/);
  assert.match(createScreen, /Saved as draft/);
  assert.match(buddiesScreen, /Saved as draft/);
  assert.match(buddiesScreen, /Discard draft/);
  assert.match(chikaDetail, /Saved as draft/);
  assert.match(chikaDetail, /Discard draft/);
});

test("local state does not become canonical server state", () => {
  const localFiles = fs
    .readdirSync(path.join(root, "src/local"), { recursive: true })
    .filter(
      (file) => String(file).endsWith(".ts") || String(file).endsWith(".tsx"),
    )
    .map((file) => read(path.join("src/local", String(file))))
    .join("\n");
  const source = fs
    .readdirSync(path.join(root, "src"), { recursive: true })
    .filter(
      (file) => String(file).endsWith(".ts") || String(file).endsWith(".tsx"),
    )
    .map((file) => read(path.join("src", String(file))))
    .join("\n");

  assert.doesNotMatch(localFiles, /zustand|create\s*\(/i);
  assert.doesNotMatch(
    localFiles,
    /CREATE TABLE IF NOT EXISTS (events|messages|profiles|groups|explore_sites)/i,
  );
  assert.doesNotMatch(
    source,
    /drizzle-orm|expo-network|BackgroundFetch|TaskManager/i,
  );
});
