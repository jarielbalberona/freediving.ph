# Phase 5 Data Safety Runbook

## Scope Delivered
- Soft-delete behavior added for core UGC records (threads, comments, personal bests, training sessions, user-authored content anonymization).
- Account deletion now anonymizes instead of hard deleting.
- Query-path indexes added for production hot paths.

## Migration Discipline
1. Model change first (`apps/api/src/models/drizzle/*`), never handwritten schema drift.
2. Generate migration with:
   - `pnpm --filter @freediving.ph/api db:generate`
3. Review SQL file in `apps/api/.drizzle/migrations/*.sql`:
   - verify `ALTER TABLE`/`CREATE INDEX` operations are expected
   - verify no destructive `DROP` unless explicitly planned
4. Apply migration in staging only after backup snapshot.
5. Run API smoke checks in staging:
   - auth
   - messages
   - threads/comments
   - events
   - dive spots
6. Promote to production with migration gate before app rollout.
7. Keep rollback notes per migration PR.

## Backup And Restore (PostgreSQL)

### Backup
- Logical backup:
  - `pg_dump --format=custom --no-owner --no-acl "$DATABASE_URL" > backup_YYYYMMDD_HHMM.dump`
- Schema-only backup:
  - `pg_dump --schema-only "$DATABASE_URL" > schema_YYYYMMDD_HHMM.sql`

### Restore (Staging Drill)
- Create clean target DB.
- Restore:
  - `pg_restore --no-owner --no-acl --clean --if-exists --dbname "$STAGING_DATABASE_URL" backup_YYYYMMDD_HHMM.dump`
- Run API checks and validate:
  - row counts on key tables
  - ability to query soft-deleted records correctly excluded from normal list APIs
  - anonymized user records remain non-identifying

### Recovery Targets
- RPO target: <= 24 hours.
- RTO target: <= 2 hours for staging rehearsal; production target per infra SLA.

## Staging Validation Checklist
- Soft-deleted content does not appear in standard list endpoints.
- Deleted user account shows anonymized identity and restricted visibility.
- Threads/messages/history remain structurally intact after anonymization.
- New indexes exist and query plans use them for:
  - messages by conversation
  - comments by thread
  - events by start date/status
  - dive spots by state/location
