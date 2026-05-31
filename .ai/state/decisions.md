# Decisions

## 2026-05-31: AI Memory V1 Is Markdown-First

Decision: Project AI memory and initiative execution state will live in repository markdown files for V1.

Rationale: The current goal is to reduce manual Codex prompt loops, not build a retrieval platform. Markdown is auditable, diffable, and cheap.

Consequences:

- No Postgres, pgvector, embeddings, vector databases, dashboards, or cloud orchestration in V1.
- Initiative state changes must be visible in git diffs.
- Any future V2 storage/indexing system must justify itself against this simpler baseline.
