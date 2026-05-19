package service

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	feedrepo "fphgo/internal/features/feed/repo"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/mediasign"
	"fphgo/internal/shared/validatex"
)

type ActivityType string

const (
	ActivityChikaThreadCreated  ActivityType = "chika_thread_created"
	ActivityDiveSiteUpdateAdded ActivityType = "dive_site_update_added"
	ActivityEventPublished      ActivityType = "event_published"
	ActivityBuddyIntentCreated  ActivityType = "buddy_intent_created"
	ActivityMediaPostCreated    ActivityType = "media_post_created"
)

type ActivityVisibility string

const (
	ActivityVisibilityPublic       ActivityVisibility = "public"
	ActivityVisibilityMembers      ActivityVisibility = "members"
	ActivityVisibilityFollowers    ActivityVisibility = "followers"
	ActivityVisibilityGroupMembers ActivityVisibility = "group_members"
	ActivityVisibilityPrivate      ActivityVisibility = "private"
)

type ActivityState string

const (
	ActivityStateActive  ActivityState = "active"
	ActivityStateHidden  ActivityState = "hidden"
	ActivityStateDeleted ActivityState = "deleted"
)

type ActivitySourceModule string

const (
	ActivitySourceChika       ActivitySourceModule = "chika"
	ActivitySourceExplore     ActivitySourceModule = "explore"
	ActivitySourceEvents      ActivitySourceModule = "events"
	ActivitySourceBuddyFinder ActivitySourceModule = "buddy_finder"
	ActivitySourceMedia       ActivitySourceModule = "media"
)

type ActivityTarget struct {
	Type string `json:"type"`
	ID   string `json:"id"`
}

type ActivityInput struct {
	UserID     string
	Mode       Mode
	Cursor     string
	Region     string
	DiveSiteID string
	Types      []ActivityType
	Limit      int
}

type ActivityResult struct {
	Items      []ActivityItem
	NextCursor string
}

type ActivityItem struct {
	ID           string
	Type         ActivityType
	SourceModule ActivitySourceModule
	SourceType   string
	SourceID     string
	Actor        ActivityActor
	Target       ActivityTarget
	Visibility   ActivityVisibility
	OccurredAt   string
	Title        string
	Body         string
	Area         string
	DiveSiteID   string
	GroupID      string
	EventID      string
	Media        []map[string]any
	Stats        map[string]any
	Metadata     map[string]any
	Href         string
}

type ActivityActor struct {
	ID        string
	Name      string
	Username  string
	AvatarURL string
}

type ActivityPublishInput struct {
	Type            ActivityType
	SourceModule    ActivitySourceModule
	SourceType      string
	SourceID        string
	ActorUserID     string
	TargetType      string
	TargetID        string
	Visibility      ActivityVisibility
	State           ActivityState
	Area            string
	DiveSiteID      string
	GroupID         string
	EventID         string
	OccurredAt      time.Time
	SourceCreatedAt time.Time
	Title           string
	Body            string
	Media           []map[string]any
	Stats           map[string]any
	Metadata        map[string]any
}

type activityCursor struct {
	OccurredAt string `json:"occurredAt"`
	ID         string `json:"id"`
}

func (s *Service) Activity(ctx context.Context, input ActivityInput) (ActivityResult, error) {
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

	cursorOccurredAt := time.Date(9999, 12, 31, 23, 59, 59, 0, time.UTC)
	cursorID := "ffffffff-ffff-ffff-ffff-ffffffffffff"
	if strings.TrimSpace(input.Cursor) != "" {
		decodedAt, decodedID, err := decodeActivityCursor(input.Cursor)
		if err != nil {
			return ActivityResult{}, ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"cursor"},
				Code:    "custom",
				Message: "invalid cursor",
			}}}
		}
		cursorOccurredAt = decodedAt
		cursorID = decodedID
	}
	homeArea, err := s.repo.GetHomeArea(ctx, input.UserID)
	if err != nil {
		return ActivityResult{}, apperrors.New(http.StatusInternalServerError, "feed_failed", "failed to resolve profile context", err)
	}
	areaFilter := strings.TrimSpace(input.Region)
	if areaFilter == "" {
		areaFilter = homeArea
	}

	if err := s.repo.RepairMediaPostActivityMedia(ctx); err != nil {
		return ActivityResult{}, apperrors.New(http.StatusInternalServerError, "activity_feed_failed", "failed to repair media activity payloads", err)
	}

	rows, err := s.repo.ListActivityItems(ctx, feedrepo.ActivityListInput{
		UserID:           strings.TrimSpace(input.UserID),
		Mode:             string(ParseMode(string(input.Mode))),
		Area:             areaFilter,
		DiveSiteID:       strings.TrimSpace(input.DiveSiteID),
		Types:            activityTypesAsStrings(input.Types),
		CursorOccurredAt: cursorOccurredAt,
		CursorID:         cursorID,
		Limit:            int32(limit + 1),
	})
	if err != nil {
		return ActivityResult{}, apperrors.New(http.StatusInternalServerError, "activity_feed_failed", "failed to load activity feed", err)
	}

	nextCursor := ""
	if len(rows) > limit {
		next := rows[limit-1]
		nextCursor = encodeActivityCursor(next.OccurredAt, next.ID)
		rows = rows[:limit]
	}

	items := make([]ActivityItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, s.mapActivityRow(row, strings.TrimSpace(input.UserID)))
	}
	return ActivityResult{Items: items, NextCursor: nextCursor}, nil
}

func (s *Service) CountActivity(ctx context.Context, input ActivityInput) (int64, error) {
	homeArea, err := s.repo.GetHomeArea(ctx, input.UserID)
	if err != nil {
		return 0, apperrors.New(http.StatusInternalServerError, "feed_failed", "failed to resolve profile context", err)
	}
	areaFilter := strings.TrimSpace(input.Region)
	if areaFilter == "" {
		areaFilter = homeArea
	}
	count, err := s.repo.CountActivityItems(ctx, feedrepo.ActivityListInput{
		UserID:     strings.TrimSpace(input.UserID),
		Mode:       string(ParseMode(string(input.Mode))),
		Area:       areaFilter,
		DiveSiteID: strings.TrimSpace(input.DiveSiteID),
		Types:      activityTypesAsStrings(input.Types),
	})
	if err != nil {
		return 0, apperrors.New(http.StatusInternalServerError, "activity_feed_failed", "failed to count activity feed", err)
	}
	return count, nil
}

func (s *Service) PublishActivity(ctx context.Context, input ActivityPublishInput) error {
	if !validActivityType(input.Type) || !validActivityVisibility(input.Visibility) || !validActivityState(input.State) {
		return nil
	}
	if input.State == "" {
		input.State = ActivityStateActive
	}
	if input.OccurredAt.IsZero() {
		input.OccurredAt = time.Now().UTC()
	}
	if input.SourceCreatedAt.IsZero() {
		input.SourceCreatedAt = input.OccurredAt
	}
	return s.repo.UpsertActivityItem(ctx, feedrepo.ActivityUpsert{
		Type:            string(input.Type),
		SourceModule:    string(input.SourceModule),
		SourceType:      strings.TrimSpace(input.SourceType),
		SourceID:        strings.TrimSpace(input.SourceID),
		ActorUserID:     strings.TrimSpace(input.ActorUserID),
		TargetType:      strings.TrimSpace(input.TargetType),
		TargetID:        strings.TrimSpace(input.TargetID),
		Visibility:      string(input.Visibility),
		State:           string(input.State),
		Area:            strings.TrimSpace(input.Area),
		DiveSiteID:      strings.TrimSpace(input.DiveSiteID),
		GroupID:         strings.TrimSpace(input.GroupID),
		EventID:         strings.TrimSpace(input.EventID),
		OccurredAt:      input.OccurredAt.UTC(),
		SourceCreatedAt: input.SourceCreatedAt.UTC(),
		Title:           strings.TrimSpace(input.Title),
		Body:            strings.TrimSpace(input.Body),
		Media:           input.Media,
		Stats:           input.Stats,
		Metadata:        input.Metadata,
	})
}

func activityTypesAsStrings(types []ActivityType) []string {
	if len(types) == 0 {
		return nil
	}
	out := make([]string, 0, len(types))
	for _, value := range types {
		trimmed := strings.TrimSpace(string(value))
		if trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}

func (s *Service) MarkActivityBySource(ctx context.Context, sourceModule, sourceType, sourceID string, state ActivityState) error {
	if !validActivityState(state) {
		return nil
	}
	return s.repo.MarkActivityBySource(ctx, sourceModule, sourceType, sourceID, string(state))
}

func (s *Service) mapActivityRow(row feedrepo.ActivityRow, viewerID string) ActivityItem {
	actor := ActivityActor{
		ID:        row.ActorUserID,
		Name:      firstNonEmpty(row.ActorName, row.ActorUsername),
		Username:  row.ActorUsername,
		AvatarURL: row.ActorAvatarURL,
	}
	if row.Type == string(ActivityChikaThreadCreated) {
		mode := stringValue(row.Metadata, "mode")
		if isPseudonymousChika(mode) && viewerID != row.ActorUserID {
			actor.ID = ""
			actor.Username = ""
			actor.AvatarURL = ""
			actor.Name = firstNonEmpty(stringValue(row.Metadata, "actorPseudonym"), "Pseudonymous")
		}
	}
	return ActivityItem{
		ID:           row.ID,
		Type:         ActivityType(row.Type),
		SourceModule: ActivitySourceModule(row.SourceModule),
		SourceType:   row.SourceType,
		SourceID:     row.SourceID,
		Actor:        actor,
		Target:       ActivityTarget{Type: row.TargetType, ID: row.TargetID},
		Visibility:   ActivityVisibility(row.Visibility),
		OccurredAt:   formatRFC3339(row.OccurredAt),
		Title:        row.Title,
		Body:         row.Body,
		Area:         row.Area,
		DiveSiteID:   row.DiveSiteID,
		GroupID:      row.GroupID,
		EventID:      row.EventID,
		Media:        s.hydrateActivityMedia(row.Media),
		Stats:        row.Stats,
		Metadata:     row.Metadata,
		Href:         activityHref(row),
	}
}

func (s *Service) hydrateActivityMedia(media []map[string]any) []map[string]any {
	if len(media) == 0 {
		return media
	}
	out := make([]map[string]any, 0, len(media))
	for _, item := range media {
		next := make(map[string]any, len(item)+1)
		for key, value := range item {
			if key == "objectKey" || key == "contextType" {
				continue
			}
			next[key] = value
		}
		if _, ok := next["displayUrl"]; !ok && s.mediaSigner != nil {
			if objectKey := stringValue(item, "objectKey"); objectKey != "" {
				if displayURL := s.mediaSigner.URL(objectKey, mediasign.PresetCard, 10*time.Minute); displayURL != "" {
					next["displayUrl"] = displayURL
				}
			}
		}
		if _, ok := next["dialogUrl"]; !ok && s.mediaSigner != nil {
			if objectKey := stringValue(item, "objectKey"); objectKey != "" {
				if dialogURL := s.mediaSigner.URL(objectKey, mediasign.PresetDialog, 10*time.Minute); dialogURL != "" {
					next["dialogUrl"] = dialogURL
				}
			}
		}
		out = append(out, next)
	}
	return out
}

func activityHref(row feedrepo.ActivityRow) string {
	switch row.Type {
	case string(ActivityChikaThreadCreated):
		return "/chika/" + row.TargetID
	case string(ActivityDiveSiteUpdateAdded), string(ActivityMediaPostCreated):
		if slug := stringValue(row.Metadata, "diveSiteSlug"); slug != "" {
			return "/explore/sites/" + slug
		}
	case string(ActivityEventPublished):
		return "/events/" + row.TargetID
	case string(ActivityBuddyIntentCreated):
		return "/buddies"
	}
	return ""
}

func encodeActivityCursor(occurredAt time.Time, id string) string {
	payload, _ := json.Marshal(activityCursor{OccurredAt: occurredAt.UTC().Format(time.RFC3339Nano), ID: id})
	return base64.RawURLEncoding.EncodeToString(payload)
}

func decodeActivityCursor(raw string) (time.Time, string, error) {
	decoded, err := base64.RawURLEncoding.DecodeString(strings.TrimSpace(raw))
	if err != nil {
		return time.Time{}, "", err
	}
	var cursor activityCursor
	if err := json.Unmarshal(decoded, &cursor); err != nil {
		return time.Time{}, "", err
	}
	occurredAt, err := time.Parse(time.RFC3339Nano, cursor.OccurredAt)
	if err != nil {
		return time.Time{}, "", err
	}
	return occurredAt.UTC(), strings.TrimSpace(cursor.ID), nil
}

func validActivityType(value ActivityType) bool {
	switch value {
	case ActivityChikaThreadCreated, ActivityDiveSiteUpdateAdded, ActivityEventPublished, ActivityBuddyIntentCreated, ActivityMediaPostCreated:
		return true
	default:
		return false
	}
}

func validActivityVisibility(value ActivityVisibility) bool {
	switch value {
	case ActivityVisibilityPublic, ActivityVisibilityMembers, ActivityVisibilityFollowers, ActivityVisibilityGroupMembers, ActivityVisibilityPrivate:
		return true
	default:
		return false
	}
}

func validActivityState(value ActivityState) bool {
	switch value {
	case "", ActivityStateActive, ActivityStateHidden, ActivityStateDeleted:
		return true
	default:
		return false
	}
}

func stringValue(values map[string]any, key string) string {
	value, ok := values[key]
	if !ok || value == nil {
		return ""
	}
	if asString, ok := value.(string); ok {
		return strings.TrimSpace(asString)
	}
	return ""
}
