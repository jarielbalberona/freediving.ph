package service

import (
	"sort"
	"strings"
	"time"
)

func normalizeScores(items []rankedItem) []rankedItem {
	byType := make(map[ItemType][]int)
	for idx := range items {
		byType[items[idx].Type] = append(byType[items[idx].Type], idx)
	}
	for _, indexes := range byType {
		minScore := items[indexes[0]].rawScore
		maxScore := items[indexes[0]].rawScore
		for _, idx := range indexes {
			if items[idx].rawScore < minScore {
				minScore = items[idx].rawScore
			}
			if items[idx].rawScore > maxScore {
				maxScore = items[idx].rawScore
			}
		}
		denom := maxScore - minScore
		for _, idx := range indexes {
			if denom <= 0 {
				items[idx].normScore = 0.5
			} else {
				items[idx].normScore = (items[idx].rawScore - minScore) / denom
			}
		}
	}
	return items
}

func sortRanked(items []rankedItem) {
	sort.SliceStable(items, func(i, j int) bool {
		if items[i].Score == items[j].Score {
			if items[i].CreatedAt == items[j].CreatedAt {
				return items[i].ID > items[j].ID
			}
			return items[i].CreatedAt > items[j].CreatedAt
		}
		return items[i].Score > items[j].Score
	})
}

func targetMix(limit int, mode Mode) map[ItemType]int {
	mix := map[ItemType]float64{
		ItemTypePost:         0.50,
		ItemTypeCommunityHot: 0.15,
		ItemTypeDiveSpot:     0.15,
		ItemTypeEvent:        0.10,
		ItemTypeBuddySignal:  0.10,
	}
	if mode == ModeSpotReports {
		mix[ItemTypePost] = 0.35
		mix[ItemTypeDiveSpot] = 0.35
		mix[ItemTypeCommunityHot] = 0.15
		mix[ItemTypeEvent] = 0.05
		mix[ItemTypeBuddySignal] = 0.10
	}
	if mode == ModeNearby {
		mix[ItemTypePost] = 0.40
		mix[ItemTypeDiveSpot] = 0.25
		mix[ItemTypeCommunityHot] = 0.10
		mix[ItemTypeEvent] = 0.10
		mix[ItemTypeBuddySignal] = 0.15
	}

	out := make(map[ItemType]int, len(mix))
	used := 0
	for typ, share := range mix {
		count := int(float64(limit) * share)
		if count < 1 {
			count = 1
		}
		out[typ] = count
		used += count
	}
	for used > limit {
		for _, typ := range []ItemType{ItemTypePost, ItemTypeCommunityHot, ItemTypeDiveSpot, ItemTypeEvent, ItemTypeBuddySignal} {
			if used <= limit {
				break
			}
			if out[typ] > 1 {
				out[typ]--
				used--
			}
		}
	}
	for used < limit {
		out[ItemTypePost]++
		used++
	}
	return out
}

func mergeWithDiversity(items []rankedItem, limit int, mode Mode) []rankedItem {
	if len(items) == 0 || limit <= 0 {
		return nil
	}
	sortRanked(items)
	groups := map[ItemType][]rankedItem{}
	for _, item := range items {
		groups[item.Type] = append(groups[item.Type], item)
	}
	targets := targetMix(limit, mode)
	picked := make([]rankedItem, 0, limit)
	seen := make(map[string]struct{})
	byActorRecent := make(map[string]int)

	pickFromGroup := func(typ ItemType, enforce bool) bool {
		queue := groups[typ]
		if len(queue) == 0 {
			return false
		}
		for idx, item := range queue {
			if _, ok := seen[item.Type.String()+":"+item.EntityID]; ok {
				continue
			}
			if !canPlace(picked, item, mode, byActorRecent, enforce) {
				continue
			}
			picked = append(picked, item)
			seen[item.Type.String()+":"+item.EntityID] = struct{}{}
			if strings.TrimSpace(item.ActorUserID) != "" {
				byActorRecent[item.ActorUserID]++
			}
			groups[typ] = append(queue[:idx], queue[idx+1:]...)
			return true
		}
		return false
	}

	for len(picked) < limit {
		progress := false
		for _, typ := range []ItemType{ItemTypePost, ItemTypeCommunityHot, ItemTypeDiveSpot, ItemTypeEvent, ItemTypeBuddySignal} {
			if len(picked) >= limit {
				break
			}
			if targets[typ] <= 0 {
				continue
			}
			if pickFromGroup(typ, true) {
				targets[typ]--
				progress = true
			}
		}
		if !progress {
			break
		}
	}

	if len(picked) < limit {
		remaining := make([]rankedItem, 0)
		for _, typ := range []ItemType{ItemTypePost, ItemTypeCommunityHot, ItemTypeDiveSpot, ItemTypeEvent, ItemTypeBuddySignal} {
			remaining = append(remaining, groups[typ]...)
		}
		sortRanked(remaining)
		for _, item := range remaining {
			if len(picked) >= limit {
				break
			}
			if _, ok := seen[item.Type.String()+":"+item.EntityID]; ok {
				continue
			}
			if !canPlace(picked, item, mode, byActorRecent, false) {
				continue
			}
			picked = append(picked, item)
			seen[item.Type.String()+":"+item.EntityID] = struct{}{}
			if strings.TrimSpace(item.ActorUserID) != "" {
				byActorRecent[item.ActorUserID]++
			}
		}
	}
	return picked
}

func canPlace(current []rankedItem, next rankedItem, mode Mode, byActor map[string]int, strict bool) bool {
	if strict && strings.TrimSpace(next.ActorUserID) != "" && byActor[next.ActorUserID] >= 2 {
		return false
	}
	if len(current) == 0 {
		return true
	}
	last := current[len(current)-1]
	if mode != ModeSpotReports && last.Type == ItemTypeDiveSpot && next.Type == ItemTypeDiveSpot {
		return false
	}
	if strict && last.ActorUserID != "" && last.ActorUserID == next.ActorUserID {
		if len(current) >= 2 && current[len(current)-2].ActorUserID == next.ActorUserID {
			return false
		}
	}
	return true
}

func applyCursor(items []rankedItem, cursorOffset int) []rankedItem {
	if cursorOffset <= 0 {
		return items
	}
	if cursorOffset >= len(items) {
		return []rankedItem{}
	}
	return items[cursorOffset:]
}

func formatRFC3339(t time.Time) string {
	return t.UTC().Format(time.RFC3339)
}

func (t ItemType) String() string {
	return string(t)
}
