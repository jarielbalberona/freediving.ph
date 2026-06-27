# Environments

Status: baseline plus migrated legacy-doc truth / needs code confirmation

Primary sources:

- current repo inspection
- migrated from legacy root docs; validation status: needs code/runtime confirmation

Current environment/runtime signals:

- local web defaults to `http://localhost:4001`
- local Go API defaults to `http://localhost:4000`
- local PostgreSQL is exposed on host port `4432` and container port `5432`
- local Expo/Metro uses port `4081`
- SEO rendered-page tooling targets `http://localhost:4001` by default
- PostgreSQL 15+ or Docker-backed local database is expected
- `env.render.example` and `render.yaml` define deployment-oriented configuration surfaces

Operational expectations promoted from legacy docs:

- environment schema should fail fast on boot when required env is missing
- production secrets belong in deployment secret storage, not committed `.env` files
- backup/restore planning assumes PostgreSQL as the primary datastore
