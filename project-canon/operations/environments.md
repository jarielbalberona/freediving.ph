# Environments

Status: baseline plus migrated legacy-doc truth / needs code confirmation

Primary sources:

- current repo inspection
- migrated from legacy root docs; validation status: needs code/runtime confirmation

Current environment/runtime signals:

- local web defaults to `http://localhost:3000`
- local Go API defaults to `http://localhost:4000`
- PostgreSQL 15+ or Docker-backed local database is expected
- `env.render.example` and `render.yaml` define deployment-oriented configuration surfaces

Operational expectations promoted from legacy docs:

- environment schema should fail fast on boot when required env is missing
- production secrets belong in deployment secret storage, not committed `.env` files
- backup/restore planning assumes PostgreSQL as the primary datastore
