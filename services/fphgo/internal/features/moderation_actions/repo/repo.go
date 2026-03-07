package repo

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	moderationactionsqlc "fphgo/internal/features/moderation_actions/repo/sqlc"
)

type Repo struct {
	pool    *pgxpool.Pool
	queries *moderationactionsqlc.Queries
}

type Target struct {
	Type   string
	UUID   *string
	Bigint *int64
}

type ActionInput struct {
	ActorUserID string
	Target      Target
	Action      string
	Reason      string
	ReportID    *string
}

type ModerationAction struct {
	ID          string
	ActorUserID string
	TargetType  string
	TargetID    string
	Action      string
	Reason      string
	ReportID    string
	CreatedAt   time.Time
}

func New(pool *pgxpool.Pool) *Repo {
	return &Repo{
		pool:    pool,
		queries: moderationactionsqlc.New(pool),
	}
}

func (r *Repo) SetUserStatusAndAudit(ctx context.Context, userID, accountStatus string, action ActionInput) (ModerationAction, error) {
	return r.withTx(ctx, func(q *moderationactionsqlc.Queries) (ModerationAction, error) {
		if _, err := q.ResolveUserExists(ctx, toUUID(userID)); err != nil {
			return ModerationAction{}, err
		}

		rows, err := q.SetUserAccountStatus(ctx, moderationactionsqlc.SetUserAccountStatusParams{
			ID:            toUUID(userID),
			AccountStatus: accountStatus,
		})
		if err != nil {
			return ModerationAction{}, err
		}
		if rows == 0 {
			return ModerationAction{}, pgx.ErrNoRows
		}

		return r.createAction(ctx, q, action)
	})
}

func (r *Repo) HideThreadAndAudit(ctx context.Context, threadID string, action ActionInput) (ModerationAction, error) {
	return r.withTx(ctx, func(q *moderationactionsqlc.Queries) (ModerationAction, error) {
		rows, err := q.HideChikaThread(ctx, toUUID(threadID))
		if err != nil {
			return ModerationAction{}, err
		}
		if rows == 0 {
			return ModerationAction{}, pgx.ErrNoRows
		}
		return r.createAction(ctx, q, action)
	})
}

func (r *Repo) UnhideThreadAndAudit(ctx context.Context, threadID string, action ActionInput) (ModerationAction, error) {
	return r.withTx(ctx, func(q *moderationactionsqlc.Queries) (ModerationAction, error) {
		rows, err := q.UnhideChikaThread(ctx, toUUID(threadID))
		if err != nil {
			return ModerationAction{}, err
		}
		if rows == 0 {
			return ModerationAction{}, pgx.ErrNoRows
		}
		return r.createAction(ctx, q, action)
	})
}

func (r *Repo) HideCommentAndAudit(ctx context.Context, commentID int64, action ActionInput) (ModerationAction, error) {
	return r.withTx(ctx, func(q *moderationactionsqlc.Queries) (ModerationAction, error) {
		rows, err := q.HideChikaComment(ctx, commentID)
		if err != nil {
			return ModerationAction{}, err
		}
		if rows == 0 {
			return ModerationAction{}, pgx.ErrNoRows
		}
		return r.createAction(ctx, q, action)
	})
}

func (r *Repo) UnhideCommentAndAudit(ctx context.Context, commentID int64, action ActionInput) (ModerationAction, error) {
	return r.withTx(ctx, func(q *moderationactionsqlc.Queries) (ModerationAction, error) {
		rows, err := q.UnhideChikaComment(ctx, commentID)
		if err != nil {
			return ModerationAction{}, err
		}
		if rows == 0 {
			return ModerationAction{}, pgx.ErrNoRows
		}
		return r.createAction(ctx, q, action)
	})
}

func (r *Repo) ListByActor(ctx context.Context, actorUserID string) ([]ModerationAction, error) {
	rows, err := r.queries.ListModerationActionsByActor(ctx, toUUID(actorUserID))
	if err != nil {
		return nil, err
	}

	items := make([]ModerationAction, 0, len(rows))
	for _, row := range rows {
		item, mapErr := mapAction(row)
		if mapErr != nil {
			return nil, mapErr
		}
		items = append(items, item)
	}
	return items, nil
}

func (r *Repo) ReportExists(ctx context.Context, reportID string) (bool, error) {
	_, err := r.queries.ResolveReportExists(ctx, toUUID(reportID))
	if err != nil {
		if IsNoRows(err) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func (r *Repo) withTx(ctx context.Context, run func(*moderationactionsqlc.Queries) (ModerationAction, error)) (ModerationAction, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return ModerationAction{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	q := r.queries.WithTx(tx)
	result, err := run(q)
	if err != nil {
		return ModerationAction{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return ModerationAction{}, err
	}
	return result, nil
}

func (r *Repo) createAction(ctx context.Context, q *moderationactionsqlc.Queries, action ActionInput) (ModerationAction, error) {
	if action.ReportID != nil && strings.TrimSpace(*action.ReportID) != "" {
		if _, err := q.ResolveReportExists(ctx, toUUID(*action.ReportID)); err != nil {
			return ModerationAction{}, err
		}
	}

	row, err := q.CreateModerationAction(ctx, moderationactionsqlc.CreateModerationActionParams{
		ActorAppUserID: toUUID(action.ActorUserID),
		TargetType:     action.Target.Type,
		TargetUuid:     toUUIDPtr(action.Target.UUID),
		TargetBigint:   action.Target.Bigint,
		Action:         action.Action,
		Reason:         strings.TrimSpace(action.Reason),
		ReportID:       toUUIDPtr(action.ReportID),
	})
	if err != nil {
		return ModerationAction{}, err
	}
	return mapAction(row)
}

func mapAction(row moderationactionsqlc.ModerationAction) (ModerationAction, error) {
	targetID, err := toTargetID(row.TargetType, row.TargetUuid, row.TargetBigint)
	if err != nil {
		return ModerationAction{}, err
	}

	return ModerationAction{
		ID:          row.ID.String(),
		ActorUserID: row.ActorAppUserID.String(),
		TargetType:  row.TargetType,
		TargetID:    targetID,
		Action:      row.Action,
		Reason:      row.Reason,
		ReportID:    uuidOrEmpty(row.ReportID),
		CreatedAt:   row.CreatedAt.Time.UTC(),
	}, nil
}

func toTargetID(targetType string, targetUUID pgtype.UUID, targetBigint *int64) (string, error) {
	switch targetType {
	case "user", "chika_thread":
		if !targetUUID.Valid {
			return "", errors.New("missing target uuid")
		}
		return targetUUID.String(), nil
	case "chika_comment":
		if targetBigint == nil || *targetBigint <= 0 {
			return "", errors.New("missing target bigint")
		}
		return int64ToString(*targetBigint), nil
	default:
		return "", errors.New("unsupported target type")
	}
}

func int64ToString(value int64) string {
	return strconv.FormatInt(value, 10)
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

func uuidOrEmpty(value pgtype.UUID) string {
	if !value.Valid {
		return ""
	}
	return value.String()
}

func IsNoRows(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}
