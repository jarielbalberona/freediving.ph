package service

import (
	"context"
	"testing"
	"time"

	feedrepo "fphgo/internal/features/feed/repo"
)

type feedRepoStub struct {
	homeArea      string
	posts         []feedrepo.PostCandidate
	mediaPosts    []feedrepo.MediaPostCandidate
	community     []feedrepo.CommunityCandidate
	spots         []feedrepo.DiveSpotCandidate
	buddySignals  []feedrepo.BuddySignalCandidate
	events        []feedrepo.EventCandidate
	hiddenRows    []feedrepo.FeedHiddenItemInsert
	activityRows  []feedrepo.ActivityRow
	activityInput feedrepo.ActivityListInput
	upserts       []feedrepo.ActivityUpsert
	marked        []feedrepo.ActivityUpsert
}

func (r *feedRepoStub) GetHomeArea(context.Context, string) (string, error) {
	return r.homeArea, nil
}

func (r *feedRepoStub) ListHiddenItems(context.Context, string) (map[string]struct{}, error) {
	return map[string]struct{}{}, nil
}

func (r *feedRepoStub) ListNegativeActionCounts(context.Context, string, time.Time) ([]feedrepo.FeedActionCount, error) {
	return nil, nil
}

func (r *feedRepoStub) ListPostCandidates(context.Context, feedrepo.CandidateInput) ([]feedrepo.PostCandidate, error) {
	return r.posts, nil
}

func (r *feedRepoStub) ListMediaPostCandidates(context.Context, feedrepo.CandidateInput) ([]feedrepo.MediaPostCandidate, error) {
	return r.mediaPosts, nil
}

func (r *feedRepoStub) ListCommunityCandidates(context.Context, feedrepo.CandidateInput) ([]feedrepo.CommunityCandidate, error) {
	return r.community, nil
}

func (r *feedRepoStub) ListDiveSpotCandidates(context.Context, feedrepo.CandidateInput) ([]feedrepo.DiveSpotCandidate, error) {
	return r.spots, nil
}

func (r *feedRepoStub) ListBuddySignalCandidates(context.Context, feedrepo.CandidateInput) ([]feedrepo.BuddySignalCandidate, error) {
	return r.buddySignals, nil
}

func (r *feedRepoStub) ListEventCandidates(context.Context, feedrepo.CandidateInput) ([]feedrepo.EventCandidate, error) {
	return r.events, nil
}

func (r *feedRepoStub) GetNearbyCondition(context.Context, string) (feedrepo.NearbyCondition, error) {
	return feedrepo.NearbyCondition{
		Spot:       "Mabini",
		Safety:     "Stable",
		Current:    "Light",
		Visibility: "10m",
		WaterTemp:  "28C",
		Wind:       "Low",
		Sunrise:    "6:00 AM",
	}, nil
}

func (r *feedRepoStub) InsertImpressions(context.Context, string, string, []feedrepo.FeedImpressionInsert) error {
	return nil
}

func (r *feedRepoStub) InsertActions(context.Context, string, string, []feedrepo.FeedActionInsert) error {
	return nil
}

func (r *feedRepoStub) InsertHiddenItems(_ context.Context, _ string, rows []feedrepo.FeedHiddenItemInsert) error {
	r.hiddenRows = append(r.hiddenRows, rows...)
	return nil
}

func (r *feedRepoStub) UpsertActivityItem(_ context.Context, row feedrepo.ActivityUpsert) error {
	r.upserts = append(r.upserts, row)
	return nil
}

func (r *feedRepoStub) MarkActivityBySource(_ context.Context, sourceModule, sourceType, sourceID, state string) error {
	r.marked = append(r.marked, feedrepo.ActivityUpsert{
		SourceModule: sourceModule,
		SourceType:   sourceType,
		SourceID:     sourceID,
		State:        state,
	})
	return nil
}

func (r *feedRepoStub) ListActivityItems(_ context.Context, input feedrepo.ActivityListInput) ([]feedrepo.ActivityRow, error) {
	r.activityInput = input
	return r.activityRows, nil
}

func TestHomeGuestExcludesMemberOnlyBuddySignals(t *testing.T) {
	t.Parallel()

	now := time.Now().UTC()
	service := New(&feedRepoStub{
		buddySignals: []feedrepo.BuddySignalCandidate{{
			ID:             "buddy-1",
			AuthorUserID:   "user-1",
			AuthorName:     "Hidden Diver",
			AuthorUsername: "hidden",
			Area:           "Mabini, Batangas",
			IntentType:     "fun_dive",
			TimeWindow:     "today",
			Visibility:     "members",
			CreatedAt:      now,
			ExpiresAt:      now.Add(time.Hour),
		}},
	})

	got, err := service.Home(context.Background(), HomeInput{Mode: ModeLatest, Limit: 20})
	if err != nil {
		t.Fatalf("Home returned error: %v", err)
	}
	for _, item := range got.Items {
		if item.Type == ItemTypeBuddySignal {
			t.Fatalf("guest feed included member-only buddy signal: %#v", item)
		}
	}
}

func TestHomeFiltersEventStatusAndVisibility(t *testing.T) {
	t.Parallel()

	now := time.Now().UTC()
	service := New(&feedRepoStub{
		events: []feedrepo.EventCandidate{
			{ID: "public", Title: "Public", Status: "published", Visibility: "public", CreatedAt: now, ViewerAuthorized: true},
			{ID: "draft", Title: "Draft", Status: "draft", Visibility: "public", CreatedAt: now.Add(-time.Minute), ViewerAuthorized: true},
			{ID: "private", Title: "Private", Status: "published", Visibility: "private", CreatedAt: now.Add(-2 * time.Minute)},
			{ID: "group-denied", Title: "Group denied", Status: "published", Visibility: "group_members", CreatedAt: now.Add(-3 * time.Minute), ViewerAuthorized: false},
			{ID: "group-allowed", Title: "Group allowed", Status: "published", Visibility: "group_members", CreatedAt: now.Add(-4 * time.Minute), ViewerAuthorized: true},
		},
	})

	got, err := service.Home(context.Background(), HomeInput{UserID: "viewer-1", Mode: ModeEvents, Limit: 20})
	if err != nil {
		t.Fatalf("Home returned error: %v", err)
	}
	ids := map[string]bool{}
	for _, item := range got.Items {
		if item.Type != ItemTypeEvent {
			t.Fatalf("events mode returned non-event item: %#v", item)
		}
		ids[item.EntityID] = true
	}
	if !ids["public"] || !ids["group-allowed"] {
		t.Fatalf("expected public and authorized group events, got %#v", ids)
	}
	for _, id := range []string{"draft", "private", "group-denied"} {
		if ids[id] {
			t.Fatalf("ineligible event %q leaked into feed: %#v", id, ids)
		}
	}
}

func TestHomeMasksPseudonymousChikaActor(t *testing.T) {
	t.Parallel()

	now := time.Now().UTC()
	service := New(&feedRepoStub{
		community: []feedrepo.CommunityCandidate{{
			ID:                   "thread-1",
			AuthorUserID:         "real-user-id",
			AuthorName:           "Real Name",
			AuthorUsername:       "real_username",
			AuthorPseudonym:      "anon-abc123",
			Mode:                 "locked_pseudonymous",
			Title:                "Pseudonymous thread",
			CategorySlug:         "confessions",
			CategoryName:         "Community Stories",
			CategoryPseudonymous: true,
			CreatedAt:            now,
		}},
	})

	got, err := service.Home(context.Background(), HomeInput{UserID: "viewer-1", Mode: ModeChika, Limit: 20})
	if err != nil {
		t.Fatalf("Home returned error: %v", err)
	}
	if len(got.Items) != 1 {
		t.Fatalf("expected one chika item, got %d", len(got.Items))
	}
	payload := got.Items[0].Payload
	if payload["authorUserId"] != "" || payload["authorUsername"] != "" {
		t.Fatalf("pseudonymous payload leaked real identity: %#v", payload)
	}
	if payload["authorName"] != "anon-abc123" {
		t.Fatalf("expected pseudonym authorName, got %#v", payload["authorName"])
	}
	if got.Items[0].AuthorHref != "" {
		t.Fatalf("pseudonymous item must not link to real author, got %q", got.Items[0].AuthorHref)
	}
}

func TestHomeStrictModesDoNotReturnUnrelatedCards(t *testing.T) {
	t.Parallel()

	now := time.Now().UTC()
	repo := &feedRepoStub{
		homeArea: "Mabini, Batangas",
		posts: []feedrepo.PostCandidate{{
			ID: "post-1", AuthorUserID: "user-1", AuthorName: "Diver", AuthorUsername: "diver", Area: "Mabini, Batangas", CreatedAt: now,
		}},
		community: []feedrepo.CommunityCandidate{{
			ID: "thread-1", AuthorUserID: "user-2", AuthorName: "Chika", AuthorUsername: "chika", Mode: "normal", Title: "Thread", CreatedAt: now,
		}},
		events: []feedrepo.EventCandidate{{
			ID: "event-1", Title: "Event", Area: "Cebu", Status: "published", Visibility: "public", CreatedAt: now, ViewerAuthorized: true,
		}},
	}
	service := New(repo)

	tests := []struct {
		mode Mode
		want ItemType
	}{
		{mode: ModeChika, want: ItemTypeCommunityHot},
		{mode: ModeDiveReports, want: ItemTypePost},
		{mode: ModeEvents, want: ItemTypeEvent},
		{mode: ModeNearby, want: ItemTypePost},
	}
	for _, tt := range tests {
		tt := tt
		t.Run(string(tt.mode), func(t *testing.T) {
			got, err := service.Home(context.Background(), HomeInput{UserID: "viewer-1", Mode: tt.mode, Limit: 20})
			if err != nil {
				t.Fatalf("Home returned error: %v", err)
			}
			if len(got.Items) == 0 {
				t.Fatalf("expected at least one item for mode %s", tt.mode)
			}
			for _, item := range got.Items {
				if item.Type != tt.want {
					t.Fatalf("mode %s returned unrelated type %s", tt.mode, item.Type)
				}
			}
		})
	}
}

func TestRecordActionsHideItemPersistsHiddenRow(t *testing.T) {
	t.Parallel()

	repo := &feedRepoStub{}
	service := New(repo)
	err := service.RecordActions(context.Background(), "viewer-1", "session-1", ModeLatest, []TelemetryAction{{
		FeedItemID: "fi_post_1",
		EntityType: "post",
		EntityID:   "post-1",
		ActionType: "hide_item",
		CreatedAt:  time.Now().UTC(),
	}})
	if err != nil {
		t.Fatalf("RecordActions returned error: %v", err)
	}
	if len(repo.hiddenRows) != 1 {
		t.Fatalf("expected one hidden row, got %#v", repo.hiddenRows)
	}
	if repo.hiddenRows[0].EntityType != "post" || repo.hiddenRows[0].EntityID != "post-1" {
		t.Fatalf("unexpected hidden row: %#v", repo.hiddenRows[0])
	}
}

func TestActivityUsesKeysetCursorAndStrictMode(t *testing.T) {
	t.Parallel()

	cursorAt := time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC)
	cursorID := "99999999-9999-9999-9999-999999999999"
	repo := &feedRepoStub{
		homeArea: "Mabini, Batangas",
		activityRows: []feedrepo.ActivityRow{
			{
				ID:           "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
				Type:         string(ActivityChikaThreadCreated),
				SourceModule: string(ActivitySourceChika),
				SourceType:   "thread",
				SourceID:     "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
				TargetType:   "chika_thread",
				TargetID:     "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
				Visibility:   string(ActivityVisibilityPublic),
				OccurredAt:   cursorAt.Add(-time.Minute),
				Title:        "Thread",
			},
		},
	}
	service := New(repo)

	got, err := service.Activity(context.Background(), ActivityInput{
		UserID: "11111111-1111-1111-1111-111111111111",
		Mode:   ModeChika,
		Cursor: encodeActivityCursor(cursorAt, cursorID),
		Region: "Cebu",
		Limit:  10,
	})
	if err != nil {
		t.Fatalf("Activity returned error: %v", err)
	}
	if repo.activityInput.Mode != string(ModeChika) {
		t.Fatalf("expected strict chika mode, got %q", repo.activityInput.Mode)
	}
	if repo.activityInput.Area != "Cebu" {
		t.Fatalf("expected explicit region, got %q", repo.activityInput.Area)
	}
	if !repo.activityInput.CursorOccurredAt.Equal(cursorAt) || repo.activityInput.CursorID != cursorID {
		t.Fatalf("cursor was not passed through: %#v", repo.activityInput)
	}
	if len(got.Items) != 1 || got.Items[0].Type != ActivityChikaThreadCreated {
		t.Fatalf("unexpected activity result: %#v", got.Items)
	}
}

func TestActivityGuestCursorIsNotReset(t *testing.T) {
	t.Parallel()

	cursorAt := time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC)
	cursorID := "99999999-9999-9999-9999-999999999999"
	repo := &feedRepoStub{}
	service := New(repo)

	_, err := service.Activity(context.Background(), ActivityInput{
		Mode:   ModeLatest,
		Cursor: encodeActivityCursor(cursorAt, cursorID),
		Limit:  10,
	})
	if err != nil {
		t.Fatalf("Activity returned error: %v", err)
	}
	if !repo.activityInput.CursorOccurredAt.Equal(cursorAt) || repo.activityInput.CursorID != cursorID {
		t.Fatalf("guest cursor was reset instead of passed through: %#v", repo.activityInput)
	}
}

func TestActivityRejectsInvalidCursor(t *testing.T) {
	t.Parallel()

	service := New(&feedRepoStub{})
	if _, err := service.Activity(context.Background(), ActivityInput{
		Mode:   ModeLatest,
		Cursor: "not-a-valid-cursor",
		Limit:  10,
	}); err == nil {
		t.Fatal("expected invalid cursor error")
	}
}

func TestActivityFilterModesNormalizeSafely(t *testing.T) {
	t.Parallel()

	tests := []struct {
		mode Mode
		want string
	}{
		{mode: ModeLatest, want: "latest"},
		{mode: ModeNearby, want: "nearby"},
		{mode: ModeChika, want: "chika"},
		{mode: ModeDiveReports, want: "dive-reports"},
		{mode: ModeEvents, want: "events"},
		{mode: Mode("following"), want: "latest"},
		{mode: Mode("training"), want: "latest"},
		{mode: Mode("spot-reports"), want: "dive-reports"},
		{mode: Mode("nonsense"), want: "latest"},
	}
	for _, tt := range tests {
		tt := tt
		t.Run(string(tt.mode), func(t *testing.T) {
			t.Parallel()
			repo := &feedRepoStub{}
			service := New(repo)
			if _, err := service.Activity(context.Background(), ActivityInput{Mode: tt.mode, Limit: 10}); err != nil {
				t.Fatalf("Activity returned error: %v", err)
			}
			if repo.activityInput.Mode != tt.want {
				t.Fatalf("expected mode %q, got %q", tt.want, repo.activityInput.Mode)
			}
		})
	}
}

func TestActivityPaginatesWithOpaqueKeysetCursor(t *testing.T) {
	t.Parallel()

	now := time.Now().UTC()
	repo := &feedRepoStub{
		activityRows: []feedrepo.ActivityRow{
			{ID: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", Type: string(ActivityEventPublished), SourceModule: string(ActivitySourceEvents), SourceType: "event", SourceID: "11111111-1111-1111-1111-111111111111", TargetType: "event", TargetID: "11111111-1111-1111-1111-111111111111", Visibility: string(ActivityVisibilityPublic), OccurredAt: now, Title: "One"},
			{ID: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", Type: string(ActivityEventPublished), SourceModule: string(ActivitySourceEvents), SourceType: "event", SourceID: "22222222-2222-2222-2222-222222222222", TargetType: "event", TargetID: "22222222-2222-2222-2222-222222222222", Visibility: string(ActivityVisibilityPublic), OccurredAt: now.Add(-time.Minute), Title: "Two"},
			{ID: "cccccccc-cccc-cccc-cccc-cccccccccccc", Type: string(ActivityEventPublished), SourceModule: string(ActivitySourceEvents), SourceType: "event", SourceID: "33333333-3333-3333-3333-333333333333", TargetType: "event", TargetID: "33333333-3333-3333-3333-333333333333", Visibility: string(ActivityVisibilityPublic), OccurredAt: now.Add(-2 * time.Minute), Title: "Three"},
		},
	}
	service := New(repo)

	got, err := service.Activity(context.Background(), ActivityInput{UserID: "viewer-1", Mode: ModeEvents, Limit: 2})
	if err != nil {
		t.Fatalf("Activity returned error: %v", err)
	}
	if len(got.Items) != 2 {
		t.Fatalf("expected 2 visible items, got %d", len(got.Items))
	}
	if got.NextCursor == "" {
		t.Fatal("expected next cursor")
	}
	decodedAt, decodedID, err := decodeActivityCursor(got.NextCursor)
	if err != nil {
		t.Fatalf("next cursor did not decode: %v", err)
	}
	if !decodedAt.Equal(repo.activityRows[1].OccurredAt) || decodedID != repo.activityRows[1].ID {
		t.Fatalf("next cursor points at wrong row: %s %s", decodedAt, decodedID)
	}
}

func TestActivityMasksPseudonymousChikaActor(t *testing.T) {
	t.Parallel()

	repo := &feedRepoStub{
		activityRows: []feedrepo.ActivityRow{{
			ID:             "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
			Type:           string(ActivityChikaThreadCreated),
			SourceModule:   string(ActivitySourceChika),
			SourceType:     "thread",
			SourceID:       "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
			ActorUserID:    "real-user",
			ActorName:      "Real Name",
			ActorUsername:  "real_username",
			ActorAvatarURL: "https://example.com/avatar.jpg",
			TargetType:     "chika_thread",
			TargetID:       "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
			Visibility:     string(ActivityVisibilityPublic),
			OccurredAt:     time.Now().UTC(),
			Title:          "Pseudonymous thread",
			Metadata:       map[string]any{"mode": "locked_pseudonymous", "actorPseudonym": "anon-abc123"},
		}},
	}
	service := New(repo)

	got, err := service.Activity(context.Background(), ActivityInput{UserID: "viewer", Mode: ModeChika, Limit: 10})
	if err != nil {
		t.Fatalf("Activity returned error: %v", err)
	}
	actor := got.Items[0].Actor
	if actor.ID != "" || actor.Username != "" || actor.AvatarURL != "" {
		t.Fatalf("pseudonymous actor leaked identity: %#v", actor)
	}
	if actor.Name != "anon-abc123" {
		t.Fatalf("expected pseudonym actor name, got %q", actor.Name)
	}
}

func TestPublishActivityUpsertsIdempotentSource(t *testing.T) {
	t.Parallel()

	repo := &feedRepoStub{}
	service := New(repo)
	occurredAt := time.Now().UTC()

	err := service.PublishActivity(context.Background(), ActivityPublishInput{
		Type:         ActivityDiveSiteUpdateAdded,
		SourceModule: ActivitySourceExplore,
		SourceType:   "dive_site_update",
		SourceID:     "11111111-1111-1111-1111-111111111111",
		ActorUserID:  "22222222-2222-2222-2222-222222222222",
		TargetType:   "dive_site_update",
		TargetID:     "11111111-1111-1111-1111-111111111111",
		Visibility:   ActivityVisibilityPublic,
		OccurredAt:   occurredAt,
		Title:        "Mabini",
		Stats:        map[string]any{"comments": 0},
	})
	if err != nil {
		t.Fatalf("PublishActivity returned error: %v", err)
	}
	if len(repo.upserts) != 1 {
		t.Fatalf("expected one upsert, got %#v", repo.upserts)
	}
	got := repo.upserts[0]
	if got.SourceModule != string(ActivitySourceExplore) || got.SourceType != "dive_site_update" || got.SourceID != "11111111-1111-1111-1111-111111111111" {
		t.Fatalf("upsert did not preserve idempotent source key: %#v", got)
	}
	if got.State != string(ActivityStateActive) {
		t.Fatalf("expected active default state, got %q", got.State)
	}
}
