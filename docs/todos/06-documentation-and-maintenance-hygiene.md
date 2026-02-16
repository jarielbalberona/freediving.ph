# 06 Documentation and Maintenance Hygiene

Status: Completed (README and maintenance guidance updated)

## Issues

- `apps/web/README.md` is still a template and not project-specific.
- `apps/api/README.md` includes legacy stack claims that do not match current code paths.
- Root docs and app docs are partially inconsistent on setup, deployment, and architecture status.
- No explicit “source of truth” doc for architecture and active feature maturity.

## Fix

- Rewrite app-level READMEs to reflect current implementation and commands.
- Add a concise architecture status page covering:
  - implemented modules
  - in-progress modules
  - unstable modules
- Keep docs linked to this `/docs/todos` backlog and update completion status as fixes land.
- Define maintenance rule:
  - behavior/config changes must include doc updates in same PR.

## Expectations

- Project docs are trustworthy and aligned with actual code.
- New contributors can identify current state without reverse-engineering source files.
- Documentation debt stops growing as part of normal PR workflow.
