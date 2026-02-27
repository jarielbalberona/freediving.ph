package service

import (
	"testing"
)

func TestNormalizePagination(t *testing.T) {
	tests := []struct {
		limit, offset int32
		wantLimit     int32
		wantOffset    int32
	}{
		{0, 0, 20, 0},
		{-1, -1, 20, 0},
		{10, 5, 10, 5},
		{100, 0, 100, 0},
		{101, 0, 20, 0},
		{50, 100, 50, 100},
	}
	for _, tt := range tests {
		gotLimit, gotOffset := normalizePagination(tt.limit, tt.offset)
		if gotLimit != tt.wantLimit || gotOffset != tt.wantOffset {
			t.Errorf("normalizePagination(%d, %d) = (%d, %d), want (%d, %d)",
				tt.limit, tt.offset, gotLimit, gotOffset, tt.wantLimit, tt.wantOffset)
		}
	}
}

func TestIsModeratorRole(t *testing.T) {
	tests := []struct {
		role string
		want bool
	}{
		{"member", false},
		{"moderator", true},
		{"admin", true},
		{"super_admin", true},
		{"", false},
		{"unknown", false},
	}
	for _, tt := range tests {
		got := isModeratorRole(tt.role)
		if got != tt.want {
			t.Errorf("isModeratorRole(%q) = %v, want %v", tt.role, got, tt.want)
		}
	}
}
