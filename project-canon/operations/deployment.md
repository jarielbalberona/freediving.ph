# Deployment

Status: baseline plus migrated legacy-doc truth / needs code confirmation

Primary sources:

- current repo inspection
- migrated from legacy root docs; validation status: needs code/runtime confirmation

Current deploy/config signals:

- Render blueprint in `render.yaml`
- Render env template in `env.render.example`
- separate web and Go API runtime surfaces
- separate CDN worker/runtime surface

Deployment expectations promoted into canon:

- PR checks should include typecheck, lint, and tests
- migration execution and rollback planning are part of the deployment boundary
- health/readiness checks are expected operational proof points
- public SEO post-deploy verification includes sitemap, robots, ads.txt, canonical metadata, and noindex/index behavior on intended routes
