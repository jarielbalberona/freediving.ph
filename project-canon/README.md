# Project Canon

This directory is the curated authoritative source of truth for the project.

- Keep product, architecture, domain, operations, decisions, and changelog documentation here.
- Update `project-canon/` when durable project truth changes.
- Do not use `project-canon/` for temporary debugging notes, task reports, or scratch findings.
- `project-canon/` is not fully seeded yet. Early canon files may be baseline summaries that still need code/runtime confirmation.

## Status

Baseline seeded from current repo inspection and then expanded with curated migration from legacy root docs.

- Source: current repo inspection unless a file explicitly says it was migrated from legacy root docs.
- Validation status: baseline only, not a full architecture or runtime audit.
- Root `docs/` is no longer a normal truth surface for this adopted project.

## Structure

- `product/` - product purpose, workflows, and user roles
- `architecture/` - bounded system structure and technical surfaces
- `domain/` - core entities, business rules, and permissions
- `operations/` - environments, deployment, troubleshooting, and verification expectations
- `decisions/` - durable ADR-level decisions when they exist
- `changelog/` - durable canon changes, not task history
