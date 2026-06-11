# Environments

Status: baseline / to be confirmed

Source: current repo inspection.

Current environment/runtime signals:

- local web defaults to `http://localhost:3000`
- local Go API defaults to `http://localhost:4000`
- PostgreSQL 15+ or Docker-backed local database is expected
- `env.render.example` and `render.yaml` define deployment-oriented configuration surfaces

Important note:

- root-level `docs/` may contain additional environment truth, but it has not yet been promoted or validated in this seed pass
