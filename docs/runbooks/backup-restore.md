# Backup and Restore Runbook

## Scope
- Primary datastore: PostgreSQL (`DATABASE_URL`).
- Target objectives:
  - RPO: 24h max data loss.
  - RTO: 2h recovery for production-facing API.

## Backup policy
1. Daily automated full backup at off-peak hours.
2. Keep 30 days of backups.
3. Encrypt backups at rest and in transit.
4. Store backup metadata (timestamp, source DB identifier, checksum).

## Pre-restore checklist
1. Confirm incident severity and restoration point timestamp.
2. Freeze writes to API if point-in-time consistency is required.
3. Notify stakeholders of expected downtime window.

## Restore procedure
1. Provision target restore database instance.
2. Restore selected backup artifact to target.
3. Run schema drift check against app migrations (`apps/api/.drizzle/migrations`).
4. Run data sanity checks:
   - user row counts
   - critical moderation tables (`reports`, `audit_logs`, `blocks`) row counts
   - latest createdAt timestamps for key content tables
5. Switch API `DATABASE_URL` to restored instance.
6. Run smoke checks:
   - `GET /health/ready`
   - authentication check
   - list endpoints (`/threads`, `/events`, `/groups`)

## Post-restore validation
1. Confirm application writes succeed.
2. Verify moderation and reporting actions still create audit entries.
3. Record restore details in incident log.

## Rollback
1. If restored DB is invalid, revert `DATABASE_URL` to previous instance.
2. Re-enable traffic only after `GET /health/ready` is stable.
