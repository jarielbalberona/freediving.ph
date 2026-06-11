# Database Architecture

Status: baseline / to be confirmed

Source: current repo inspection.

Current database-related signals:

- PostgreSQL is the stated database
- `services/fphgo/db/migrations` is the migration location
- `services/fphgo/db/schema` is the canonical SQL schema reference
- `packages/db` exists as a shared TypeScript DB schema/helper surface

This adoption pass does not yet assert detailed ownership or table-level domain rules.
