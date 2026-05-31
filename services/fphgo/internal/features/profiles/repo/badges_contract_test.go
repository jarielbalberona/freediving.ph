package repo

import (
	"os"
	"strings"
	"testing"
)

func TestDiveSitesVisitedContractUsesUserDiveSitesSource(t *testing.T) {
	raw, err := os.ReadFile("repo.go")
	if err != nil {
		t.Fatalf("read repo.go: %v", err)
	}
	source := string(raw)
	if !strings.Contains(source, "countDiveSitesVisitedFromUserDiveSitesByUsername") {
		t.Fatal("Dive Sites Visited must count through user_dive_sites by username")
	}
	if !strings.Contains(source, "countDiveSitesVisitedFromUserDiveSitesByUserID") {
		t.Fatal("Dive Sites Visited must count through user_dive_sites by user id")
	}
	if strings.Contains(source, "dive_memories") {
		t.Fatal("Dive Sites Visited must not count dive memories; shared/tagged memories must not inflate counts")
	}
	if strings.Contains(source, "JOIN dive_site_updates dsu") {
		t.Fatal("Dive Sites Visited must not count dive_site_updates; non-proof activity must not inflate counts")
	}
}

func TestProfileDiveMapReadsRequireUnlockedUserDiveSiteAndOwnedProofMedia(t *testing.T) {
	raw, err := os.ReadFile("repo.go")
	if err != nil {
		t.Fatalf("read repo.go: %v", err)
	}
	source := string(raw)
	if !strings.Contains(source, "JOIN user_dive_sites uds ON uds.user_id = u.id") {
		t.Fatal("profile Dive Map reads must require user_dive_sites unlock rows")
	}
	if !strings.Contains(source, "JOIN media_items mi ON mi.post_id = p.id") {
		t.Fatal("profile Dive Map detail must read proof media from media_items")
	}
	if !strings.Contains(source, "p.author_app_user_id = $1") {
		t.Fatal("profile Dive Map detail must scope proof posts to the target user")
	}
	if !strings.Contains(source, "mi.author_app_user_id = p.author_app_user_id") {
		t.Fatal("profile Dive Map detail must return only target-owned media items")
	}
	if !strings.Contains(source, "mi.dive_site_id = p.dive_site_id") {
		t.Fatal("profile Dive Map detail must keep media proof on the unlocked dive site")
	}
	if !strings.Contains(source, "mi.status = 'active'") ||
		!strings.Contains(source, "mi.processing_status = 'ready'") ||
		!strings.Contains(source, "mi.moderation_status = 'approved'") {
		t.Fatal("profile Dive Map detail must return only active ready approved proof media")
	}
	if strings.Contains(source, "dive_memory") {
		t.Fatal("profile Dive Map V1 must not read Dive Memories")
	}
}

func TestPublicProfileBadgesExcludePrivateUserBadges(t *testing.T) {
	raw, err := os.ReadFile("repo.go")
	if err != nil {
		t.Fatalf("read repo.go: %v", err)
	}
	source := string(raw)
	if !strings.Contains(source, "ub.visibility = 'public'") {
		t.Fatal("public profile badges must filter out private user badges")
	}
}
