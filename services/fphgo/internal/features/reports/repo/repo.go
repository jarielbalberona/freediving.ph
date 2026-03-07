package repo

import (
	"context"
	"encoding/json"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	reportsqlc "fphgo/internal/features/reports/repo/sqlc"
)

type Repo struct {
	queries *reportsqlc.Queries
}

type Report struct {
	ID              string
	ReporterUserID  string
	TargetType      string
	TargetID        string
	TargetAppUserID string
	ReasonCode      string
	Details         string
	EvidenceURLs    []string
	Status          string
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type ReportEvent struct {
	ID          string
	ReportID    string
	ActorUserID string
	EventType   string
	FromStatus  string
	ToStatus    string
	Note        string
	CreatedAt   time.Time
}

type CreateReportInput struct {
	ReporterUserID  string
	TargetType      string
	TargetUUID      *string
	TargetBigint    *int64
	TargetAppUserID string
	ReasonCode      string
	Details         string
	EvidenceURLs    []string
}

type ListReportsInput struct {
	CursorCreatedAt time.Time
	CursorID        string
	Limit           int32
	StatusFilter    *string
	TargetType      *string
	ReporterUserID  *string
}

func New(pool *pgxpool.Pool) *Repo {
	return &Repo{queries: reportsqlc.New(pool)}
}

func (r *Repo) CreateReport(ctx context.Context, input CreateReportInput) (Report, error) {
	evidence, err := json.Marshal(input.EvidenceURLs)
	if err != nil {
		return Report{}, err
	}
	var details *string
	if strings.TrimSpace(input.Details) != "" {
		trimmed := strings.TrimSpace(input.Details)
		details = &trimmed
	}

	row, err := r.queries.CreateReport(ctx, reportsqlc.CreateReportParams{
		ReporterAppUserID: toUUID(input.ReporterUserID),
		TargetType:        input.TargetType,
		TargetUuid:        toUUIDPtr(input.TargetUUID),
		TargetBigint:      input.TargetBigint,
		TargetAppUserID:   toUUIDNullable(input.TargetAppUserID),
		ReasonCode:        input.ReasonCode,
		Details:           details,
		EvidenceUrls:      evidence,
	})
	if err != nil {
		return Report{}, err
	}
	return mapReport(row)
}

func (r *Repo) GetReportByID(ctx context.Context, reportID string) (Report, error) {
	row, err := r.queries.GetReportByID(ctx, toUUID(reportID))
	if err != nil {
		return Report{}, err
	}
	return mapReport(row)
}

func (r *Repo) ListReportsForModeration(ctx context.Context, input ListReportsInput) ([]Report, error) {
	params := reportsqlc.ListReportsForModerationParams{
		CreatedAt:        toTimestamptz(input.CursorCreatedAt),
		ID:               toUUID(input.CursorID),
		Limit:            input.Limit,
		StatusFilter:     input.StatusFilter,
		TargetTypeFilter: input.TargetType,
	}
	if input.ReporterUserID != nil && strings.TrimSpace(*input.ReporterUserID) != "" {
		params.ReporterFilter = toUUID(*input.ReporterUserID)
	}

	rows, err := r.queries.ListReportsForModeration(ctx, params)
	if err != nil {
		return nil, err
	}
	items := make([]Report, 0, len(rows))
	for _, row := range rows {
		item, mapErr := mapReport(row)
		if mapErr != nil {
			return nil, mapErr
		}
		items = append(items, item)
	}
	return items, nil
}

func (r *Repo) ListReportEventsByReportID(ctx context.Context, reportID string) ([]ReportEvent, error) {
	rows, err := r.queries.ListReportEventsByReportID(ctx, toUUID(reportID))
	if err != nil {
		return nil, err
	}
	items := make([]ReportEvent, 0, len(rows))
	for _, row := range rows {
		items = append(items, ReportEvent{
			ID:          row.ID.String(),
			ReportID:    row.ReportID.String(),
			ActorUserID: row.ActorAppUserID.String(),
			EventType:   row.EventType,
			FromStatus:  valueOrEmpty(row.FromStatus),
			ToStatus:    valueOrEmpty(row.ToStatus),
			Note:        valueOrEmpty(row.Note),
			CreatedAt:   row.CreatedAt.Time.UTC(),
		})
	}
	return items, nil
}

func (r *Repo) AddReportEvent(ctx context.Context, reportID, actorID, eventType string, fromStatus, toStatus, note *string) (ReportEvent, error) {
	row, err := r.queries.AddReportEvent(ctx, reportsqlc.AddReportEventParams{
		ReportID:       toUUID(reportID),
		ActorAppUserID: toUUID(actorID),
		EventType:      eventType,
		FromStatus:     fromStatus,
		ToStatus:       toStatus,
		Note:           note,
	})
	if err != nil {
		return ReportEvent{}, err
	}
	return ReportEvent{
		ID:          row.ID.String(),
		ReportID:    row.ReportID.String(),
		ActorUserID: row.ActorAppUserID.String(),
		EventType:   row.EventType,
		FromStatus:  valueOrEmpty(row.FromStatus),
		ToStatus:    valueOrEmpty(row.ToStatus),
		Note:        valueOrEmpty(row.Note),
		CreatedAt:   row.CreatedAt.Time.UTC(),
	}, nil
}

func (r *Repo) UpdateReportStatus(ctx context.Context, reportID, status string) (Report, error) {
	row, err := r.queries.UpdateReportStatus(ctx, reportsqlc.UpdateReportStatusParams{
		ID:     toUUID(reportID),
		Status: status,
	})
	if err != nil {
		return Report{}, err
	}
	return mapReport(row)
}

func (r *Repo) FindRecentReportByReporterAndTarget(
	ctx context.Context,
	reporterID, targetType string,
	targetUUID *string,
	targetBigint *int64,
	since time.Time,
) (bool, time.Time, error) {
	if targetUUID != nil {
		row, err := r.queries.FindRecentReportByReporterAndTargetUUID(ctx, reportsqlc.FindRecentReportByReporterAndTargetUUIDParams{
			ReporterAppUserID: toUUID(reporterID),
			TargetType:        targetType,
			TargetUuid:        toUUID(*targetUUID),
			CreatedAt:         toTimestamptz(since),
		})
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return false, time.Time{}, nil
			}
			return false, time.Time{}, err
		}
		return true, row.CreatedAt.Time.UTC(), nil
	}
	if targetBigint != nil {
		row, err := r.queries.FindRecentReportByReporterAndTargetBigint(ctx, reportsqlc.FindRecentReportByReporterAndTargetBigintParams{
			ReporterAppUserID: toUUID(reporterID),
			TargetType:        targetType,
			TargetBigint:      targetBigint,
			CreatedAt:         toTimestamptz(since),
		})
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return false, time.Time{}, nil
			}
			return false, time.Time{}, err
		}
		return true, row.CreatedAt.Time.UTC(), nil
	}
	return false, time.Time{}, errors.New("missing typed target id")
}

func (r *Repo) CountReportsByReporterSince(ctx context.Context, reporterID string, since time.Time) (int64, error) {
	return r.queries.CountReportsByReporterSince(ctx, reportsqlc.CountReportsByReporterSinceParams{
		ReporterAppUserID: toUUID(reporterID),
		CreatedAt:         toTimestamptz(since),
	})
}

func (r *Repo) ResolveTargetAuthor(ctx context.Context, targetType string, targetUUID *string, targetBigint *int64) (string, error) {
	switch targetType {
	case "user":
		if targetUUID == nil {
			return "", errors.New("missing target uuid")
		}
		id, err := r.queries.ResolveUserExists(ctx, toUUID(*targetUUID))
		if err != nil {
			return "", err
		}
		return id.String(), nil
	case "message":
		if targetBigint == nil {
			return "", errors.New("missing target bigint")
		}
		authorID, err := r.queries.ResolveMessageAuthor(ctx, *targetBigint)
		if err != nil {
			return "", err
		}
		return authorID.String(), nil
	case "chika_thread":
		if targetUUID == nil {
			return "", errors.New("missing target uuid")
		}
		id, err := r.queries.ResolveChikaThreadAuthor(ctx, toUUID(*targetUUID))
		if err != nil {
			return "", err
		}
		return id.String(), nil
	case "chika_comment":
		if targetBigint == nil {
			return "", errors.New("missing target bigint")
		}
		authorID, err := r.queries.ResolveChikaCommentAuthor(ctx, *targetBigint)
		if err != nil {
			return "", err
		}
		return authorID.String(), nil
	case "dive_site_update":
		if targetUUID == nil {
			return "", errors.New("missing target uuid")
		}
		id, err := r.queries.ResolveDiveSiteUpdateAuthor(ctx, toUUID(*targetUUID))
		if err != nil {
			return "", err
		}
		return id.String(), nil
	default:
		return "", errors.New("unsupported target type")
	}
}

func IsNoRows(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}

func mapReport(row reportsqlc.Report) (Report, error) {
	evidence := []string{}
	if len(row.EvidenceUrls) > 0 {
		if err := json.Unmarshal(row.EvidenceUrls, &evidence); err != nil {
			return Report{}, err
		}
	}
	targetID, err := toTargetID(row.TargetType, row.TargetUuid, row.TargetBigint)
	if err != nil {
		return Report{}, err
	}

	return Report{
		ID:              row.ID.String(),
		ReporterUserID:  row.ReporterAppUserID.String(),
		TargetType:      row.TargetType,
		TargetID:        targetID,
		TargetAppUserID: uuidOrEmpty(row.TargetAppUserID),
		ReasonCode:      row.ReasonCode,
		Details:         valueOrEmpty(row.Details),
		EvidenceURLs:    evidence,
		Status:          row.Status,
		CreatedAt:       row.CreatedAt.Time.UTC(),
		UpdatedAt:       row.UpdatedAt.Time.UTC(),
	}, nil
}

func toUUID(value string) pgtype.UUID {
	var id pgtype.UUID
	_ = id.Scan(value)
	return id
}

func toUUIDPtr(value *string) pgtype.UUID {
	if value == nil || strings.TrimSpace(*value) == "" {
		return pgtype.UUID{}
	}
	return toUUID(*value)
}

func toUUIDNullable(value string) pgtype.UUID {
	if strings.TrimSpace(value) == "" {
		return pgtype.UUID{}
	}
	return toUUID(value)
}

func toTargetID(targetType string, targetUUID pgtype.UUID, targetBigint *int64) (string, error) {
	switch targetType {
	case "user", "chika_thread", "dive_site_update":
		if !targetUUID.Valid {
			return "", errors.New("missing target_uuid for uuid target type")
		}
		return targetUUID.String(), nil
	case "message", "chika_comment":
		if targetBigint == nil || *targetBigint <= 0 {
			return "", errors.New("missing target_bigint for bigint target type")
		}
		return strconv.FormatInt(*targetBigint, 10), nil
	default:
		return "", errors.New("unsupported target type")
	}
}

func toTimestamptz(value time.Time) pgtype.Timestamptz {
	return pgtype.Timestamptz{Time: value.UTC(), Valid: true}
}

func valueOrEmpty(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func uuidOrEmpty(value pgtype.UUID) string {
	if !value.Valid {
		return ""
	}
	return value.String()
}
