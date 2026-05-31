package repo

import (
	"os"
	"strings"
	"testing"
)

func TestDiveSitesVisitedFallbackContractExcludesSharedOrNonProofSources(t *testing.T) {
	raw, err := os.ReadFile("repo.go")
	if err != nil {
		t.Fatalf("read repo.go: %v", err)
	}
	source := string(raw)
	if !strings.Contains(source, "Final contract: user_dive_sites") {
		t.Fatal("Dive Sites Visited contract must document user_dive_sites as final source")
	}
	if !strings.Contains(source, "user-owned media_posts.dive_site_id") {
		t.Fatal("Dive Sites Visited contract must document user-owned media_posts.dive_site_id derivation")
	}
	if strings.Contains(source, "JOIN media_items mi") {
		t.Fatal("Dive Sites Visited fallback must not count media_items; shared/tagged memories must not inflate counts")
	}
	if strings.Contains(source, "JOIN dive_site_updates dsu") {
		t.Fatal("Dive Sites Visited fallback must not count dive_site_updates; non-proof activity must not inflate counts")
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
