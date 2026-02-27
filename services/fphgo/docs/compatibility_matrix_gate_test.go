package docs_test

import (
	"os"
	"strings"
	"testing"
)

func TestCompatibilityMatrixIncludesMigratedFeatures(t *testing.T) {
	content, err := os.ReadFile("api-compatibility-matrix.md")
	if err != nil {
		t.Fatalf("read matrix: %v", err)
	}

	requiredSnippets := []string{
		"/v1/me",
		"/v1/auth/session",
		"/v1/messages/inbox",
		"/v1/chika/threads",
		"/v1/me/profile",
		"/v1/blocks",
		"/v1/reports",
		"/v1/moderation/users/{appUserId}/suspend",
		"/v1/moderation/chika/threads/{threadId}/hide",
	}

	matrix := string(content)
	for _, snippet := range requiredSnippets {
		if !strings.Contains(matrix, snippet) {
			t.Fatalf("compatibility matrix missing required migrated endpoint snippet: %s", snippet)
		}
	}
}
