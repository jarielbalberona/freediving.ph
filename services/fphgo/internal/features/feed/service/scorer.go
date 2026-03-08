package service

import (
	"math"
	"strings"
	"time"
)

func freshnessScore(createdAt time.Time, halfLifeHours float64) float64 {
	if halfLifeHours <= 0 {
		halfLifeHours = 24
	}
	ageHours := time.Since(createdAt).Hours()
	if ageHours < 0 {
		ageHours = 0
	}
	return math.Exp(-ageHours / halfLifeHours)
}

func areaMatchBoost(homeArea, candidateArea string) float64 {
	home := strings.ToLower(strings.TrimSpace(homeArea))
	candidate := strings.ToLower(strings.TrimSpace(candidateArea))
	if home == "" || candidate == "" {
		return 0
	}
	if home == candidate {
		return 0.20
	}
	if strings.Contains(home, candidate) || strings.Contains(candidate, home) {
		return 0.10
	}
	return 0
}

func modeMultiplier(mode Mode, itemType ItemType, localBoost float64) (float64, []string) {
	reasons := make([]string, 0, 2)
	multiplier := 1.0
	switch mode {
	case ModeFollowing:
		if itemType == ItemTypePost || itemType == ItemTypeMediaPost || itemType == ItemTypeBuddySignal || itemType == ItemTypeEvent {
			multiplier += 0.35
			reasons = append(reasons, "following")
		}
		if itemType == ItemTypeDiveSpot {
			multiplier -= 0.08
		}
	case ModeNearby:
		if localBoost > 0 {
			multiplier += 0.40
			reasons = append(reasons, "nearby")
		}
		if itemType == ItemTypeBuddySignal {
			multiplier += 0.30
			reasons = append(reasons, "buddy_activity")
		}
		if itemType == ItemTypeDiveSpot || itemType == ItemTypePost || itemType == ItemTypeMediaPost {
			multiplier += 0.18
		}
	case ModeTraining:
		if itemType == ItemTypePost || itemType == ItemTypeMediaPost || itemType == ItemTypeBuddySignal || itemType == ItemTypeEvent {
			multiplier += 0.30
			reasons = append(reasons, "training_affinity")
		}
		if itemType == ItemTypeDiveSpot {
			multiplier -= 0.12
		}
	case ModeSpotReports:
		if itemType == ItemTypeDiveSpot || itemType == ItemTypePost || itemType == ItemTypeMediaPost {
			multiplier += 0.38
			reasons = append(reasons, "spot_reports")
		}
		if itemType == ItemTypeCommunityHot {
			multiplier -= 0.10
		}
	}
	return multiplier, reasons
}
