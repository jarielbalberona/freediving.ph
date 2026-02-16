# 05 Deployment and Environment Alignment

Status: Completed (Render-first alignment + env alias normalization)

## Issues

- Repository currently contains mixed deployment directions:
  - AWS ECS Terraform + GitHub Actions
  - Render migration docs + Render blueprints
- API environment schema requires keys that do not align with Render config key names.
- Mismatch risk between CI/CD variables, runtime env validation, and platform-specific configuration.
- Duplicate deployment definitions can lead to accidental drift and failed rollouts.

## Fix

- Choose and confirm the active deployment target (AWS or Render) for current phase.
- Align all env names across:
  - `apps/api/src/core/env.ts`
  - `render.yaml` and `apps/api/render.yaml`
  - GitHub Actions deploy workflow
  - example env files
- Remove or clearly deprecate inactive deploy flow docs/configs.
- Add deployment matrix doc:
  - required variables by service
  - source of truth per variable
  - validation and secret ownership
- Add one smoke-check script/step for production-like env validation before deployment.

## Expectations

- One clear deployment path is operationally authoritative.
- Deploy configs, env schema, and CI variables are consistent.
- API starts cleanly in target environment without env validation failures.
- Onboarding/deployment docs are unambiguous for maintainers.
