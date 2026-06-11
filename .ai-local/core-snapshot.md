# Generated Core Snapshot

Generated from parent .ai/core/*.md.
Fallback only. Do not edit by hand.

---
Source: .ai/core/docs-grounding-rules.md
---
# Docs Grounding Rules

- `project-canon/` is the authoritative curated project truth.
- `docs/` is legacy/reference/unstructured docs.
- `.ai/` is the shared agent operating system.
- `.ai/` is not the authoritative project source of truth.
- `.ai-project.md` is the project-specific agent contract.
- Code and tests are executable truth.
- Tickets are work-intent truth.

Role separation:

- `project-canon/` holds durable project truth.
- `.ai/` holds workflow/operating-system truth and limited temporary state.
- `.ai/` must not duplicate `project-canon/` except for workflow pointers/summaries required by the operating model.
- `.ai-local/` is generated fallback only, never canonical.

Markdown discipline:

- Do not create random markdown/text files during grounding or triage.
- Durable project documentation belongs in `project-canon/`.
- Reusable workflow documentation belongs in `.ai/core/` or `.ai/workspace/`.
- Temporary task notes belong only in `.ai/state/` during active work and must be cleaned at closeout.

The ticket or pasted issue is the entry point, not the full source of truth.

Before implementation, factor in:

- project-canon
- legacy/reference docs when useful
- current code patterns
- architecture decisions
- domain rules
- project guardrails
- runtime evidence where available

If project-canon/, docs/, code, ticket, and runtime behavior disagree, surface the conflict during triage instead of silently choosing one.

---
Source: .ai/core/execution-loop.md
---
# Execution Loop

Ticket / pasted issue
→ triage
→ project-canon + repo grounding
→ spec finalization
→ execution
→ local/runtime verification
→ report
→ project-canon update if durable project truth changed
→ `.ai` update if workflow/guardrail memory changed
→ task closeout

Rules:

- Triage is read-only.
- Implementation must be the smallest safe change.
- Verification must match the task type.
- Before running checks, choose the verification level based on the failure boundary.
- Do not default to E2E.
- Do not stop at typecheck for behavioral issues.
- Do not claim completion without proof.
- If verification is incomplete, report exactly what was not verified.
- The final report must justify the selected verification level.

Task closeout:

- update `project-canon/` if durable project truth changed
- update `.ai/` only if workflow/guardrail memory changed
- clean `.ai/state/` temporary task files
- check whether any new `.md`, `.mdx`, or `.txt` files were created
- keep new markdown/text files only when they match an approved location and purpose
- promote durable truth into `project-canon/`
- promote reusable workflow learning into `.ai/core/` or `.ai/workspace/`
- delete random reports, plans, handoffs, initiative notes, and scratch files
- regenerate `.ai-local/core-snapshot.md` if `.ai` core/project contract changed
- final report must state Project Canon Update, AI Memory Update, AI State Cleanup, and Markdown File Hygiene

---
Source: .ai/core/memory-update-rules.md
---
# Memory Update Rules

Update `project-canon/` when:

- product behavior
- architecture
- domain rules
- permissions
- workflows
- API contracts
- database ownership/scoping rules
- deployment/runtime behavior
- integration behavior
- verification expectations for the project change

Update `.ai/` when:

- shared workflow rules change
- report format changes
- reusable verification rule changes
- recurring agent failure mode is discovered
- workspace convention changes
- project initialization/sync behavior changes

Clean `.ai/state/` when:

- task is complete
- temporary triage notes were superseded by report/canon
- findings were either promoted or discarded

Do not store in `.ai/state/` or `.ai/` as durable memory:

- raw command logs
- temporary debugging notes
- task transcripts
- stale reports
- generated noise
- duplicated project-canon content

Do not update `project-canon/` for styling-only changes, one-off implementation details, temporary debugging notes, or noisy logs.

## Markdown Hygiene

Do not create markdown as a substitute for memory discipline.

Task reports, old plans, scratch findings, completed initiatives, and handoff notes
must not be stored as random repo files.

Allowed destinations:

- durable project truth -> `project-canon/`
- reusable workflow truth -> `.ai/core/` or `.ai/workspace/`
- temporary task state -> `.ai/state/`, then cleaned
- final task report -> chat/ticket/PR, not a random repo markdown file

If the content is not durable or reusable, delete it.

---
Source: .ai/core/report-format.md
---
# Report Format

```md
## Verdict
PASS / PASS WITH ISSUES / FAIL / BLOCKED

## Summary
What was done or found.

## Files Changed
Grouped by area.

## Behavior Changed
User-visible or system-visible behavior changes.

## Verification Selection
Selected verification level:
Reason:
Why E2E was/was not needed:

## Verification
Commands, tests, local runtime checks, browser checks, device checks, DB checks.

## Risks / Gaps
Anything not verified, deferred, risky, or blocked.

## Project Canon Update
Updated: yes/no
Files:
Reason:

## Legacy Docs Reference
Used: yes/no
Files:
Reason:

## AI Memory Update
Updated: yes/no
Files:
Reason:

## AI State Cleanup
Cleaned: yes/no
Files removed:
Files retained:
Reason if retained:

## Markdown File Hygiene
New markdown/text files created: yes/no
Files:
Approved location/purpose:
Deleted temporary/random files:
Remaining concerns:
```

---
Source: .ai/core/triage-rules.md
---
# Triage Rules

Triage is read-only.

During triage, the agent must:

- Understand the ticket or pasted issue.
- Inspect relevant docs and code.
- Separate symptom from likely root cause.
- Identify affected surfaces.
- Define expected behavior and current behavior.
- Recommend a minimal safe fix path.
- Stop after assessment unless explicitly told to implement.

During triage, the agent must not:

- Edit code.
- Create migrations.
- Broaden scope silently.
- Treat the ticket as the only source of truth.


---
Source: .ai/core/verification-rules.md
---
# Verification Rules

Default verification mode:

```txt
Local-Verified
```

Runtime-Verified umbrella:

```txt
Runtime-Verified
├─ Local-Verified
├─ Browser-Verified
├─ API-Verified
├─ DB-Verified
├─ Device-Verified
└─ Preview-Verified
```

Rules:

- Local verification is the default for this workspace.
- Preview verification is optional and project/task-specific.
- Device verification is required when mobile, tablet, printer, or offline-first behavior is involved.
- DB verification is required for migrations, data isolation, and persistence changes.
- No fake success states.

## Verification Selection Rule

E2E is not the default verification mode.

The agent must choose verification based on the failure boundary, affected surface, and risk level.

Use the narrowest reliable proof that would catch the bug if it regressed.

Preferred escalation order:

1. Static checks — typecheck, lint, import/build sanity
2. Unit tests — pure logic, validators, payload builders, state transitions
3. Component tests — UI state, rendering, form behavior
4. Integration/API tests — route/service/database/auth/tenant behavior
5. Local runtime/browser verification — user-facing behavior, cache, routing, UI flow
6. E2E tests — full critical journeys spanning frontend, backend, auth, database, and routing
7. Device/runtime verification — mobile, SQLite, printer, offline/reconnect, native behavior

Escalate to E2E only when:

- the issue spans multiple layers,
- the user-facing journey itself is the required proof,
- a critical revenue/POS/auth/tenant flow needs regression coverage,
- lower-level tests cannot prove the fix.

Do not use E2E by default for isolated logic, payload, component, styling, copy, or narrow API bugs.

Do not stop at typecheck when the issue is behavioral.

Allowed verdicts:

```txt
PASS
PASS WITH ISSUES
FAIL
BLOCKED
```

