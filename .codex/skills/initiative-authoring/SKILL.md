---
name: initiative-authoring
description: Convert a human Freediving Philippines feature or technical specification into a structured .ai initiative plan. Use when asked to create, draft, author, or update an initiative under .ai/initiatives. This skill is planning-only and must not modify application code.
---

# Initiative Authoring

Use this skill to turn a human specification into `.ai/initiatives/<initiative-key>/`.

## Hard Rule

This skill is planning-only. Do not modify app, service, package, schema, infrastructure, or test code. Only write initiative planning files under `.ai/initiatives/<initiative-key>/`.

## Read First

- `AGENTS.md`
- `.ai/README.md`
- `.ai/core/project-brief.md`
- `.ai/core/architecture-rules.md`
- `.ai/core/product-rules.md`
- `.ai/core/conventions.md`
- `.ai/core/domain-model.md`
- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`
- `.ai/templates/initiative-template.md`
- `.ai/templates/phase-template.md`

## Output Structure

Create:

```text
.ai/initiatives/<initiative-key>/
  00-overview.md
  01-domain-model.md
  02-module-sequence.md
  03-cross-module-data-flow.md
  04-verification-plan.md
  phases/
    phase-0-foundation.md
    phase-1-...
  reports/
```

Use lowercase kebab-case for `<initiative-key>`.

## Authoring Workflow

1. Extract the real objective, not just the requested implementation.
2. Separate scope from non-goals. If the request is broad, split it into phases instead of making one giant phase.
3. Identify affected modules using actual repo paths.
4. Define domain terms that future agents must not guess.
5. Define a module sequence that reduces blast radius.
6. Define cross-module data flow for frontend, backend, shared contracts, persistence, and external services if applicable.
7. Define verification commands per phase.
8. Add hard stops for product, UX, security, privacy, auth, destructive migration, or conflicting-spec decisions.
9. Create phase files with `Status: pending`.

## Phase Quality Bar

Each phase must have:

- one clear goal
- explicit in-scope and out-of-scope boundaries
- concrete tasks
- exact verification commands
- expected evidence
- repair policy
- hard stops where relevant

If a phase cannot be verified code-wise, say so directly and require human review at initiative completion.

## Blunt CTO Check

Before finishing, remove wishful thinking. A phase plan that says "implement the feature" is useless. A good phase tells the next agent exactly what boundary to change, how to prove it worked, and when to stop instead of improvising.
