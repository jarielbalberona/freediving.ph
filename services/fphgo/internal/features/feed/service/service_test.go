package service

import (
	"context"
	"testing"
	"time"

	feedrepo "fphgo/internal/features/feed/repo"
)

type feedRepoStub struct {
	homeArea     string
	posts        []feedrepo.PostCandidate
	mediaPosts   []feedrepo.MediaPostCandidate
	community    []feedrepo.CommunityCandidate
	spots        []feedrepo.DiveSpotCandidate
	buddySignals []feedrepo.BuddySignalCandidate
	events       []feedrepo.EventCandidate
	hiddenRows   []feedrepo.FeedHiddenItemInsert
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
