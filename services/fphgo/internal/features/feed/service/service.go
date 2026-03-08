package service

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	feedrepo "fphgo/internal/features/feed/repo"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/validatex"
)

type repository interface {
	GetHomeArea(ctx context.Context, userID string) (string, error)
	ListHiddenItems(ctx context.Context, userID string) (map[string]struct{}, error)
	ListNegativeActionCounts(ctx context.Context, userID string, since time.Time) ([]feedrepo.FeedActionCount, error)
	ListPostCandidates(ctx context.Context, input feedrepo.CandidateInput) ([]feedrepo.PostCandidate, error)
	ListMediaPostCandidates(ctx context.Context, input feedrepo.CandidateInput) ([]feedrepo.MediaPostCandidate, error)
	ListCommunityCandidates(ctx context.Context, input feedrepo.CandidateInput) ([]feedrepo.CommunityCandidate, error)
	ListDiveSpotCandidates(ctx context.Context, input feedrepo.CandidateInput) ([]feedrepo.DiveSpotCandidate, error)
	ListBuddySignalCandidates(ctx context.Context, input feedrepo.CandidateInput) ([]feedrepo.BuddySignalCandidate, error)
	ListEventCandidates(ctx context.Context, input feedrepo.CandidateInput) ([]feedrepo.EventCandidate, error)
	GetNearbyCondition(ctx context.Context, userID string) (feedrepo.NearbyCondition, error)
	InsertImpressions(ctx context.Context, userID, sessionID string, rows []feedrepo.FeedImpressionInsert) error
	InsertActions(ctx context.Context, userID, sessionID string, rows []feedrepo.FeedActionInsert) error
}

type Service struct {
	repo repository
}

type ValidationFailure struct {
	Issues []validatex.Issue
}

func (e ValidationFailure) Error() string { return "validation failed" }

func New(repo repository) *Service {
	return &Service{repo: repo}
}

func ParseMode(raw string) Mode {
	switch Mode(strings.TrimSpace(raw)) {
	case ModeFollowing:
		return ModeFollowing
	case ModeNearby:
		return ModeNearby
	case ModeTraining:
		return ModeTraining
	case ModeSpotReports:
		return ModeSpotReports
	default:
		return ModeFollowing
	}
}

func (s *Service) Home(ctx context.Context, input HomeInput) (HomeResult, error) {
	isGuest := strings.TrimSpace(input.UserID) == ""
	limit := input.Limit
	if limit <= 0 {
		limit = 20
	}
	if limit > 50 {
		limit = 50
	}
	if isGuest && limit > 10 {
		limit = 10
	}

	offset, err := decodeCursor(input.Cursor)
	if err != nil {
		return HomeResult{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"cursor"},
			Code:    "custom",
			Message: "invalid cursor",
		}}}
	}
	if isGuest {
		offset = 0
	}

	homeArea, err := s.repo.GetHomeArea(ctx, input.UserID)
	if err != nil {
		return HomeResult{}, apperrors.New(http.StatusInternalServerError, "feed_failed", "failed to resolve profile context", err)
	}

	hidden, err := s.repo.ListHiddenItems(ctx, input.UserID)
	if err != nil {
		return HomeResult{}, apperrors.New(http.StatusInternalServerError, "feed_failed", "failed to load hidden feed items", err)
	}
	negative, err := s.repo.ListNegativeActionCounts(ctx, input.UserID, time.Now().UTC().AddDate(0, 0, -30))
	if err != nil {
		return HomeResult{}, apperrors.New(http.StatusInternalServerError, "feed_failed", "failed to load feed behavior signals", err)
	}
	negativeMap := make(map[string]int64, len(negative))
	for _, row := range negative {
		negativeMap[row.EntityType+":"+row.EntityID] = row.Count
	}

	candidateLimit := int32(limit * 4)
	if candidateLimit < 40 {
		candidateLimit = 40
	}
	candidatesInput := feedrepo.CandidateInput{UserID: input.UserID, Limit: candidateLimit}

	posts, err := s.repo.ListPostCandidates(ctx, candidatesInput)
	if err != nil {
		return HomeResult{}, apperrors.New(http.StatusInternalServerError, "feed_failed", "failed to load post candidates", err)
	}
	mediaPosts, err := s.repo.ListMediaPostCandidates(ctx, candidatesInput)
	if err != nil {
		return HomeResult{}, apperrors.New(http.StatusInternalServerError, "feed_failed", "failed to load media post candidates", err)
	}
	community, err := s.repo.ListCommunityCandidates(ctx, candidatesInput)
	if err != nil {
		return HomeResult{}, apperrors.New(http.StatusInternalServerError, "feed_failed", "failed to load community candidates", err)
	}
	spots, err := s.repo.ListDiveSpotCandidates(ctx, candidatesInput)
	if err != nil {
		return HomeResult{}, apperrors.New(http.StatusInternalServerError, "feed_failed", "failed to load dive spot candidates", err)
	}
	buddySignals, err := s.repo.ListBuddySignalCandidates(ctx, candidatesInput)
	if err != nil {
		return HomeResult{}, apperrors.New(http.StatusInternalServerError, "feed_failed", "failed to load buddy signal candidates", err)
	}
	events, err := s.repo.ListEventCandidates(ctx, candidatesInput)
	if err != nil {
		return HomeResult{}, apperrors.New(http.StatusInternalServerError, "feed_failed", "failed to load event candidates", err)
	}

	mode := ParseMode(string(input.Mode))
	ranked := make([]rankedItem, 0, len(posts)+len(mediaPosts)+len(community)+len(spots)+len(buddySignals)+len(events))
	for _, row := range posts {
		entityKey := "post:" + row.ID
		if _, blocked := hidden[entityKey]; blocked {
			continue
		}
		localBoost := areaMatchBoost(homeArea, row.Area)
		score := 0.45 + freshnessScore(row.CreatedAt, 18)*0.40 + localBoost
		reasons := []string{"fresh"}
		if row.SavedByViewer {
			score += 0.10
			reasons = append(reasons, "saved_spot_related")
		}
		if localBoost > 0 {
			reasons = append(reasons, "nearby_spot")
		}
		multiplier, modeReasons := modeMultiplier(mode, ItemTypePost, localBoost)
		score *= multiplier
		reasons = append(reasons, modeReasons...)
		if penalty := negativeMap[entityKey]; penalty > 0 {
			score -= 0.08 * float64(penalty)
			reasons = append(reasons, "feedback_penalty")
		}
		presentation := presentationFor(mode, ItemTypePost, reasons)
		ranked = append(ranked, rankedItem{
			FeedItem: FeedItem{
				ID:         "fi_post_" + row.ID,
				Type:       ItemTypePost,
				EntityID:   row.ID,
				Score:      score,
				Reasons:    dedupeReasons(reasons),
				TypeLabel:  presentation.TypeLabel,
				TypeHint:   presentation.TypeHint,
				RankLabel:  presentation.RankLabel,
				RankHint:   presentation.RankHint,
				Tone:       presentation.Tone,
				DetailHref: diveSiteHref(row.DiveSiteSlug),
				AuthorHref: profileHref(row.AuthorUsername),
				CreatedAt:  formatRFC3339(row.CreatedAt),
				Payload: map[string]any{
					"authorUserId":   row.AuthorUserID,
					"authorName":     row.AuthorName,
					"authorUsername": row.AuthorUsername,
					"diveSiteId":     row.DiveSiteID,
					"diveSiteSlug":   row.DiveSiteSlug,
					"diveSiteName":   row.DiveSiteName,
					"area":           row.Area,
					"note":           row.Note,
					"current":        row.Current,
					"waves":          row.Waves,
					"savedByViewer":  row.SavedByViewer,
				},
			},
			ActorUserID: row.AuthorUserID,
			Area:        row.Area,
			rawScore:    score,
		})
	}
	for _, row := range mediaPosts {
		entityKey := "media_post:" + row.ID
		if _, blocked := hidden[entityKey]; blocked {
			continue
		}
		localBoost := areaMatchBoost(homeArea, row.Area)
		itemDensityBoost := float64(row.ItemCount) * 0.03
		if itemDensityBoost > 0.15 {
			itemDensityBoost = 0.15
		}
		score := 0.42 + freshnessScore(row.CreatedAt, 24)*0.34 + itemDensityBoost + localBoost
		reasons := []string{"fresh"}
		if row.SavedByViewer {
			score += 0.08
			reasons = append(reasons, "saved_spot_related")
		}
		if localBoost > 0 {
			reasons = append(reasons, "nearby")
		}
		multiplier, modeReasons := modeMultiplier(mode, ItemTypeMediaPost, localBoost)
		score *= multiplier
		reasons = append(reasons, modeReasons...)
		if penalty := negativeMap[entityKey]; penalty > 0 {
			score -= 0.08 * float64(penalty)
			reasons = append(reasons, "feedback_penalty")
		}
		presentation := presentationFor(mode, ItemTypeMediaPost, reasons)
		ranked = append(ranked, rankedItem{
			FeedItem: FeedItem{
				ID:         "fi_media_" + row.ID,
				Type:       ItemTypeMediaPost,
				EntityID:   row.ID,
				Score:      score,
				Reasons:    dedupeReasons(reasons),
				TypeLabel:  presentation.TypeLabel,
				TypeHint:   presentation.TypeHint,
				RankLabel:  presentation.RankLabel,
				RankHint:   presentation.RankHint,
				Tone:       presentation.Tone,
				DetailHref: profileHref(row.AuthorUsername),
				AuthorHref: profileHref(row.AuthorUsername),
				CreatedAt:  formatRFC3339(row.CreatedAt),
				Payload: map[string]any{
					"authorUserId":    row.AuthorUserID,
					"authorName":      row.AuthorName,
					"authorUsername":  row.AuthorUsername,
					"diveSiteId":      row.DiveSiteID,
					"diveSiteSlug":    row.DiveSiteSlug,
					"diveSiteName":    row.DiveSiteName,
					"area":            row.Area,
					"postCaption":     row.PostCaption,
					"previewCaption":  row.PreviewCaption,
					"previewMediaId":  row.PreviewMediaID,
					"previewMimeType": row.PreviewMimeType,
					"previewWidth":    row.PreviewWidth,
					"previewHeight":   row.PreviewHeight,
					"itemCount":       row.ItemCount,
					"items":           row.Items,
				},
			},
			ActorUserID: row.AuthorUserID,
			Area:        row.Area,
			rawScore:    score,
		})
	}
	for _, row := range community {
		entityKey := "community_hot_post:" + row.ID
		if _, blocked := hidden[entityKey]; blocked {
			continue
		}
		heat := float64(row.ReplyCount)*0.03 + float64(row.ReactionCount)*0.015
		score := 0.30 + freshnessScore(row.CreatedAt, 24)*0.35 + heat
		reasons := []string{"community_heat"}
		multiplier, modeReasons := modeMultiplier(mode, ItemTypeCommunityHot, 0)
		score *= multiplier
		reasons = append(reasons, modeReasons...)
		if penalty := negativeMap[entityKey]; penalty > 0 {
			score -= 0.08 * float64(penalty)
			reasons = append(reasons, "feedback_penalty")
		}
		presentation := presentationFor(mode, ItemTypeCommunityHot, reasons)
		ranked = append(ranked, rankedItem{
			FeedItem: FeedItem{
				ID:         "fi_community_" + row.ID,
				Type:       ItemTypeCommunityHot,
				EntityID:   row.ID,
				Score:      score,
				Reasons:    dedupeReasons(reasons),
				TypeLabel:  presentation.TypeLabel,
				TypeHint:   presentation.TypeHint,
				RankLabel:  presentation.RankLabel,
				RankHint:   presentation.RankHint,
				Tone:       presentation.Tone,
				DetailHref: chikaHref(row.ID),
				AuthorHref: profileHref(row.AuthorUsername),
				CreatedAt:  formatRFC3339(row.CreatedAt),
				Payload: map[string]any{
					"authorUserId":   row.AuthorUserID,
					"authorName":     row.AuthorName,
					"authorUsername": row.AuthorUsername,
					"title":          row.Title,
					"categorySlug":   row.CategorySlug,
					"categoryName":   row.CategoryName,
					"replyCount":     row.ReplyCount,
					"reactionCount":  row.ReactionCount,
				},
			},
			ActorUserID: row.AuthorUserID,
			rawScore:    score,
		})
	}
	for _, row := range spots {
		entityKey := "dive_spot:" + row.ID
		if _, blocked := hidden[entityKey]; blocked {
			continue
		}
		localBoost := areaMatchBoost(homeArea, row.Area)
		score := 0.25 + freshnessScore(row.LastUpdatedAt, 48)*0.25 + float64(row.SaveCount)*0.02 + float64(row.RecentUpdateCount)*0.03 + localBoost
		reasons := []string{"utility_spot"}
		if row.SavedByViewer {
			score += 0.12
			reasons = append(reasons, "saved_spot_related")
		}
		if localBoost > 0 {
			reasons = append(reasons, "nearby")
		}
		multiplier, modeReasons := modeMultiplier(mode, ItemTypeDiveSpot, localBoost)
		score *= multiplier
		reasons = append(reasons, modeReasons...)
		if penalty := negativeMap[entityKey]; penalty > 0 {
			score -= 0.08 * float64(penalty)
			reasons = append(reasons, "feedback_penalty")
		}
		presentation := presentationFor(mode, ItemTypeDiveSpot, reasons)
		ranked = append(ranked, rankedItem{
			FeedItem: FeedItem{
				ID:         "fi_spot_" + row.ID,
				Type:       ItemTypeDiveSpot,
				EntityID:   row.ID,
				Score:      score,
				Reasons:    dedupeReasons(reasons),
				TypeLabel:  presentation.TypeLabel,
				TypeHint:   presentation.TypeHint,
				RankLabel:  presentation.RankLabel,
				RankHint:   presentation.RankHint,
				Tone:       presentation.Tone,
				DetailHref: diveSiteHref(row.Slug),
				CreatedAt:  formatRFC3339(row.LastUpdatedAt),
				Payload: map[string]any{
					"name":               row.Name,
					"slug":               row.Slug,
					"area":               row.Area,
					"description":        row.Description,
					"entryDifficulty":    row.EntryDifficulty,
					"verificationStatus": row.Verification,
					"saveCount":          row.SaveCount,
					"recentUpdateCount":  row.RecentUpdateCount,
					"savedByViewer":      row.SavedByViewer,
				},
			},
			Area:     row.Area,
			rawScore: score,
		})
	}
	for _, row := range events {
		entityKey := "event:" + row.ID
		if _, blocked := hidden[entityKey]; blocked {
			continue
		}
		score := 0.20 + freshnessScore(row.CreatedAt, 72)*0.30 + float64(row.MemberCount)*0.03
		reasons := []string{"event_activity"}
		if row.ViewerMember {
			score += 0.12
			reasons = append(reasons, "network_interest")
		}
		multiplier, modeReasons := modeMultiplier(mode, ItemTypeEvent, 0)
		score *= multiplier
		reasons = append(reasons, modeReasons...)
		if penalty := negativeMap[entityKey]; penalty > 0 {
			score -= 0.08 * float64(penalty)
			reasons = append(reasons, "feedback_penalty")
		}
		presentation := presentationFor(mode, ItemTypeEvent, reasons)
		ranked = append(ranked, rankedItem{
			FeedItem: FeedItem{
				ID:         "fi_event_" + row.ID,
				Type:       ItemTypeEvent,
				EntityID:   row.ID,
				Score:      score,
				Reasons:    dedupeReasons(reasons),
				TypeLabel:  presentation.TypeLabel,
				TypeHint:   presentation.TypeHint,
				RankLabel:  presentation.RankLabel,
				RankHint:   presentation.RankHint,
				Tone:       presentation.Tone,
				DetailHref: eventHref(row.ID),
				CreatedAt:  formatRFC3339(row.CreatedAt),
				Payload: map[string]any{
					"title":        row.Title,
					"memberCount":  row.MemberCount,
					"viewerMember": row.ViewerMember,
				},
			},
			rawScore: score,
		})
	}
	for _, row := range buddySignals {
		entityKey := "buddy_signal:" + row.ID
		if _, blocked := hidden[entityKey]; blocked {
			continue
		}
		localBoost := areaMatchBoost(homeArea, row.Area)
		score := 0.35 + freshnessScore(row.CreatedAt, 16)*0.35 + localBoost
		reasons := []string{"buddy_activity"}
		if row.SavedByViewer {
			score += 0.10
			reasons = append(reasons, "saved_spot_related")
		}
		if localBoost > 0 {
			reasons = append(reasons, "nearby")
		}
		multiplier, modeReasons := modeMultiplier(mode, ItemTypeBuddySignal, localBoost)
		score *= multiplier
		reasons = append(reasons, modeReasons...)
		if penalty := negativeMap[entityKey]; penalty > 0 {
			score -= 0.08 * float64(penalty)
			reasons = append(reasons, "feedback_penalty")
		}
		presentation := presentationFor(mode, ItemTypeBuddySignal, reasons)
		ranked = append(ranked, rankedItem{
			FeedItem: FeedItem{
				ID:         "fi_buddy_" + row.ID,
				Type:       ItemTypeBuddySignal,
				EntityID:   row.ID,
				Score:      score,
				Reasons:    dedupeReasons(reasons),
				TypeLabel:  presentation.TypeLabel,
				TypeHint:   presentation.TypeHint,
				RankLabel:  presentation.RankLabel,
				RankHint:   presentation.RankHint,
				Tone:       presentation.Tone,
				DetailHref: buddyHref(row.ID),
				AuthorHref: profileHref(row.AuthorUsername),
				CreatedAt:  formatRFC3339(row.CreatedAt),
				Payload: map[string]any{
					"authorUserId":   row.AuthorUserID,
					"authorName":     row.AuthorName,
					"authorUsername": row.AuthorUsername,
					"area":           row.Area,
					"intentType":     row.IntentType,
					"timeWindow":     row.TimeWindow,
					"note":           row.Note,
					"diveSiteId":     row.DiveSiteID,
					"diveSiteName":   row.DiveSiteName,
					"savedByViewer":  row.SavedByViewer,
				},
			},
			ActorUserID: row.AuthorUserID,
			Area:        row.Area,
			rawScore:    score,
		})
	}

	ranked = normalizeScores(ranked)
	for idx := range ranked {
		ranked[idx].Score = 0.65*ranked[idx].normScore + 0.35*ranked[idx].rawScore
	}

	sort.SliceStable(ranked, func(i, j int) bool {
		if ranked[i].Score == ranked[j].Score {
			if ranked[i].CreatedAt == ranked[j].CreatedAt {
				return ranked[i].ID > ranked[j].ID
			}
			return ranked[i].CreatedAt > ranked[j].CreatedAt
		}
		return ranked[i].Score > ranked[j].Score
	})

	merged := mergeWithDiversity(ranked, limit*3, mode)
	paged := applyCursor(merged, offset)
	if len(paged) > limit {
		paged = paged[:limit]
	}

	items := make([]FeedItem, 0, len(paged))
	for _, item := range paged {
		item.Score = roundScore(item.Score)
		items = append(items, item.FeedItem)
	}

	nextCursor := ""
	if !isGuest && offset+len(items) < len(merged) {
		nextCursor = encodeCursor(offset + len(items))
	}

	nearby, err := s.repo.GetNearbyCondition(ctx, input.UserID)
	if err != nil {
		return HomeResult{}, apperrors.New(http.StatusInternalServerError, "feed_failed", "failed to load nearby condition", err)
	}

	frame := contextForMode(mode, isGuest)

	return HomeResult{
		Context: ContextBlock{
			Greeting:    frame.Greeting,
			Message:     frame.Message,
			SafetyBadge: frame.SafetyBadge,
		},
		QuickActions: quickActionsForMode(mode),
		NearbyCondition: NearbyCondition{
			Spot:       nearby.Spot,
			DistanceKm: nearby.DistanceKm,
			Safety:     nearby.Safety,
			Current:    nearby.Current,
			Visibility: nearby.Visibility,
			WaterTemp:  nearby.WaterTemp,
			Wind:       nearby.Wind,
			Sunrise:    nearby.Sunrise,
		},
		Items:      items,
		NextCursor: nextCursor,
	}, nil
}

func (s *Service) RecordImpressions(ctx context.Context, userID, sessionID string, mode Mode, rows []TelemetryImpression) error {
	if strings.TrimSpace(userID) == "" {
		return apperrors.New(http.StatusUnauthorized, "unauthorized", "authentication required", nil)
	}
	session := strings.TrimSpace(sessionID)
	if session == "" {
		return ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"sessionId"},
			Code:    "required",
			Message: "sessionId is required",
		}}}
	}
	mapped := make([]feedrepo.FeedImpressionInsert, 0, len(rows))
	for idx, row := range rows {
		if strings.TrimSpace(row.FeedItemID) == "" || strings.TrimSpace(row.EntityType) == "" || strings.TrimSpace(row.EntityID) == "" {
			return ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"items", idx},
				Code:    "required",
				Message: "feedItemId, entityType, and entityId are required",
			}}}
		}
		mapped = append(mapped, feedrepo.FeedImpressionInsert{
			FeedItemID: row.FeedItemID,
			EntityType: row.EntityType,
			EntityID:   row.EntityID,
			Mode:       string(mode),
			Position:   row.Position,
			SeenAt:     row.SeenAt,
		})
	}
	if err := s.repo.InsertImpressions(ctx, userID, session, mapped); err != nil {
		return apperrors.New(http.StatusInternalServerError, "feed_telemetry_failed", "failed to record impressions", err)
	}
	return nil
}

func (s *Service) RecordActions(ctx context.Context, userID, sessionID string, mode Mode, rows []TelemetryAction) error {
	if strings.TrimSpace(userID) == "" {
		return apperrors.New(http.StatusUnauthorized, "unauthorized", "authentication required", nil)
	}
	session := strings.TrimSpace(sessionID)
	if session == "" {
		return ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"sessionId"},
			Code:    "required",
			Message: "sessionId is required",
		}}}
	}
	mapped := make([]feedrepo.FeedActionInsert, 0, len(rows))
	for idx, row := range rows {
		if strings.TrimSpace(row.EntityType) == "" || strings.TrimSpace(row.EntityID) == "" || strings.TrimSpace(row.ActionType) == "" {
			return ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"items", idx},
				Code:    "required",
				Message: "entityType, entityId, and actionType are required",
			}}}
		}
		mapped = append(mapped, feedrepo.FeedActionInsert{
			FeedItemID: row.FeedItemID,
			EntityType: row.EntityType,
			EntityID:   row.EntityID,
			ActionType: row.ActionType,
			Mode:       string(mode),
			Value:      row.Value,
			CreatedAt:  row.CreatedAt,
		})
	}
	if err := s.repo.InsertActions(ctx, userID, session, mapped); err != nil {
		return apperrors.New(http.StatusInternalServerError, "feed_telemetry_failed", "failed to record actions", err)
	}
	return nil
}

func encodeCursor(offset int) string {
	if offset <= 0 {
		return ""
	}
	payload := fmt.Sprintf("o:%d", offset)
	return base64.RawURLEncoding.EncodeToString([]byte(payload))
}

func decodeCursor(cursor string) (int, error) {
	trimmed := strings.TrimSpace(cursor)
	if trimmed == "" {
		return 0, nil
	}
	raw, err := base64.RawURLEncoding.DecodeString(trimmed)
	if err != nil {
		return 0, err
	}
	parts := strings.SplitN(string(raw), ":", 2)
	if len(parts) != 2 || parts[0] != "o" {
		return 0, errors.New("invalid cursor format")
	}
	offset, err := strconv.Atoi(parts[1])
	if err != nil || offset < 0 {
		return 0, errors.New("invalid cursor offset")
	}
	return offset, nil
}

func dedupeReasons(reasons []string) []string {
	seen := make(map[string]struct{}, len(reasons))
	out := make([]string, 0, len(reasons))
	for _, reason := range reasons {
		normalized := strings.TrimSpace(reason)
		if normalized == "" {
			continue
		}
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		out = append(out, normalized)
	}
	return out
}

func roundScore(value float64) float64 {
	if value < 0 {
		value = 0
	}
	if value > 1.5 {
		value = 1.5
	}
	return float64(int(value*1000)) / 1000
}
