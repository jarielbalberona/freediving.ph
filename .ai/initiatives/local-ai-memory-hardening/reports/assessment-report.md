# Local AI Memory And Autonomous Execution Assessment

Date: 2026-05-31

## Verdict: PASS WITH ISSUES

The `.ai` V1 memory setup is useful and already paid for itself: it forced explicit ownership boundaries, produced durable reports, preserved hard-stop reasoning, and made cross-initiative execution auditable. It is safe to reuse for the next FPH initiative if a human/Codex operator continues to supervise sequencing and judgment.

It is not yet safe to delegate blindly to `tools/ai-runner/index.mjs`. The runner has concrete correctness gaps that can break future autonomous execution.

## Files Reviewed

- `.ai/README.md`
- `.ai/core/*`
- `.ai/state/*`
- `.ai/templates/*`
- `.ai/initiatives/user-dive-map/**`
- `.ai/initiatives/dive-journey/**`
- `.ai/initiatives/dive-passport/**`
- `.ai/initiatives/profile-experience-integration/**`
- `.codex/skills/initiative-authoring/SKILL.md`
- `.codex/skills/project-memory-execution/SKILL.md`
- `tools/ai-runner/index.mjs`

No application code, migrations, shared contracts, tests, backend, or frontend files were modified.

## What Worked

- The markdown-first model is the right V1 choice. It is diffable, reviewable, cheap, and good enough.
- Initiative overview files usually captured objective, scope, non-goals, acceptance criteria, hard stops, and verification plans clearly enough for autonomous work.
- Hard product invariants were repeated in enough places to prevent major source-of-truth drift:
  - Dive Map proof comes from user-owned qualifying media.
  - Journey is downstream storytelling.
  - Passport is read-only presentation.
  - Dive Memories/tagged-user privacy is deferred.
- The first User Dive Map hard-stop worked as intended. The system stopped on undefined Dive Memories/tagged-user privacy instead of guessing.
- Reports were mostly honest. They recorded actual command results, known unrelated failures, deferred work, and residual risks.
- `decisions.md` stayed clean. It contains durable decisions only, not phase chatter.
- Verification plans were strong enough to catch real contract drift, especially the Passport compact DTO mismatch found during integration.
- Final reports are useful for handoff. They summarize what changed, what passed, what failed, and what remains unresolved.

## What Failed Or Was Weak

- Phase statuses are inconsistent. Some phases use `completed`, but `tools/ai-runner/index.mjs` only accepts `pending`, `in_progress`, `repairing`, `passed`, `passed_with_issues`, `blocked`, and `failed`. A future runner pass can throw on these files.
- Runner phase ordering is unsafe. It sorts filenames lexically, so `phase-10-*` can sort before `phase-2-*`. If multiple phases are pending, strict sequence can be violated.
- Several overview files still say `Execution started: no` even after final reports exist. State files became more accurate than initiative overviews, which creates two sources of operational truth.
- `current-state.md` still has a stale `Next execution target: yes` under completed `dive-journey`.
- `known-risks.md` captured real risks but now contains some stale or historical statements, such as older transitional fallback notes that later integration work changed.
- Reports are useful but uneven. Some are high-signal and specific; others are broad audit summaries with less direct command evidence.
- Verification status is good at the initiative level but not machine-readable enough for automation. It is prose-heavy and hard for a runner to reason about safely.
- The runner writes generic reports and appends state sections mechanically. That would become noisy quickly if used heavily.
- The runner cannot determine whether an agent actually respected hard stops; it mostly trusts prompt compliance and command exit codes.
- The runner does not verify initiative `locked`, `ready for execution`, dependency order, or cross-initiative prerequisites.

## Workflow Risks

- Autonomous execution still depends on agent judgment more than the runner. That is acceptable for V1, but call it what it is: assisted autonomous execution, not reliable orchestration.
- Broad phase scopes can invite accidental expansion. The profile integration phases stayed mostly under control, but several phases combined audit, fixes, verification, and reporting.
- Full repo verification can be polluted by unrelated dirty worktree drift. The mobile Expo dependency issue was handled honestly, but future agents need a standard way to classify unrelated failures.
- DB-dependent phases need explicit DSN handling. The user had to provide `DB_DSN` and test DB context during execution.
- Manual report writing worked, but consistency depends on discipline. The runner-generated report template is weaker than the manually written reports.

## Memory Quality Risks

- `.ai/state/current-state.md` is readable but can become stale because initiative overview files and state files duplicate fields.
- `.ai/state/known-risks.md` is accumulating both active risks and resolved history. Without pruning or status labels, it will become noisy.
- `.ai/state/verification-status.md` gives confidence for humans, but it is not structured enough for reliable automated gating.
- Phase reports are good evidence, but there is no index that says which reports are authoritative and which are obsolete after a later phase supersedes them.
- Deferred work is repeated across multiple files. That helped during execution, but it creates maintenance overhead.

## Runner/Skill Risks

- Must fix: `tools/ai-runner/index.mjs` lexical phase ordering can execute phase 10 before phase 2.
- Must fix: runner status parser rejects `completed`, but completed phases now exist.
- Must fix: runner does not check initiative lock/readiness before execution.
- Must fix: runner does not understand cross-initiative dependencies.
- Must fix: runner treats verification command exit status as the only real success criterion. It cannot detect product-rule violations unless tests catch them.
- Must fix: runner appends state updates instead of replacing initiative-specific sections, creating long-term state noise.
- Risk: runner blindly extracts and executes backticked verification commands from markdown. That is acceptable only if initiative files are trusted and reviewed.
- Risk: runner can overwrite phase status based on command results even if the agent documented a blocker in the report.
- Skill risk: `project-memory-execution` says execute exactly one phase, but the user workflow needed chained initiative execution. The chaining rules lived in the prompt, not the skill.
- Skill risk: neither skill requires a preflight consistency check for statuses, phase numbering, lock/readiness, or stale state before execution.

## Documentation Gaps

- No canonical status vocabulary enforcement across authoring, execution, runner, and reports. `completed` appeared even though the runner does not accept it.
- No documented phase filename numbering rule that avoids lexical sort bugs. Filenames should use zero-padded numbers or the runner should parse numeric phase IDs.
- No clear rule for when to update initiative `00-overview.md` after execution starts/completes.
- No stale-risk lifecycle: active, accepted, resolved, superseded.
- No standard unrelated-failure classification format.
- No standard DB credential/env section for migration or integration phases.
- No runner contract document that says what the runner guarantees versus what the agent must still judge.

## Recommended Improvements

- Standardize statuses: use only `pending`, `in_progress`, `repairing`, `passed`, `passed_with_issues`, `blocked`, and `failed`, or add `completed` everywhere including the runner.
- Fix runner phase ordering by parsing numeric phase prefixes instead of lexical sorting.
- Add a runner preflight:
  - initiative exists
  - status locked
  - ready for execution yes
  - phase statuses valid
  - no skipped pending phase before a terminal later phase
  - reports folder exists
  - dependencies are satisfied
- Add a runner `--check-only` mode that validates initiative structure without invoking Codex.
- Add structured frontmatter or a small JSON sidecar for phase status, command outcomes, and final verdicts if automation becomes more important.
- Change state updates from append-only blobs to keyed initiative sections.
- Add risk status labels: `active`, `accepted`, `resolved`, `superseded`.
- Add report quality requirements to templates:
  - exact commands
  - exact failure excerpt
  - files changed
  - phase scope confirmation
  - unrelated drift classification
- Add explicit DB/env requirements to phases that need migrations or integration tests.
- Add a final consistency checker for state, phase statuses, final reports, and verification status.

## Must-Fix Before Next Autonomous Execution

1. Fix phase ordering in `tools/ai-runner/index.mjs`.
2. Resolve status vocabulary mismatch around `completed`.
3. Add lock/readiness validation before runner execution.
4. Add stale state cleanup for:
   - `dive-journey` `Next execution target: yes`
   - initiative overview `Execution started` fields where final reports exist
   - resolved/stale risks in `known-risks.md`
5. Add an explicit unrelated-failure classification rule to the execution skill and report template.

## Nice-To-Have Improvements

- Add `pnpm ai:check <initiative>` for structure/status/report validation.
- Add a generated report index per initiative.
- Add a lightweight `state/archive.md` for resolved historical risks.
- Add reusable environment notes for local DB names and DSNs.
- Add stricter templates for integration initiatives versus feature initiatives.
- Add a final "copy/paste prompt" generator only after runner preflight is fixed.

## Whether V1 Is Ready For Reuse

Yes, with supervision.

V1 is ready for the next FPH initiative if the operator uses the `.ai` files and skills as disciplined guidance and does not rely on the runner as a fully trustworthy orchestrator. The system is good enough to reduce chaos. It is not good enough to remove engineering judgment.

## Whether This Setup Is Ready To Copy To Another Project Later

Not yet.

The concepts are portable, but the implementation is too FPH-specific and the runner has correctness gaps. Copy the pattern later, not the current mechanics. Before copying, extract:

- generic initiative templates
- generic status/preflight checker
- numeric phase ordering
- clearer state/risk lifecycle
- project-specific core docs separated from reusable workflow docs

## Whether V2 Database/Indexing Is Justified Yet

No.

V2 database/indexing is not justified yet. The current problems are not retrieval scale problems; they are workflow correctness problems:

- status drift
- stale state
- unsafe runner ordering
- weak preflight validation
- noisy risk lifecycle

Adding a database, embeddings, or indexes now would hide the real defects under infrastructure. Fix V1 discipline and runner correctness first. Reconsider V2 only after multiple more initiatives show that humans cannot find relevant memory fast enough from markdown and simple search.

## Final Assessment

The `.ai` setup worked because the initiative specs were explicit and the operator enforced discipline. The local runner is the weak link. Treat the markdown memory as reusable V1 infrastructure, but fix runner sequencing/status validation and state hygiene before trusting another long autonomous chain.
