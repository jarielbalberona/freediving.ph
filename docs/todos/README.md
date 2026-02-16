# Todo Backlog

This folder tracks concrete technical issues discovered in the current repository state.

Each todo document includes:
- `Issues`
- `Fix`
- `Expectations`

## Execution Order

1. `01-setup-and-build-stability.md`
2. `02-web-type-safety-and-api-contracts.md`
3. `03-shared-types-package-adoption.md`
4. `04-backend-critical-bugs-and-contract-alignment.md`
5. `05-deployment-and-environment-alignment.md`
6. `06-documentation-and-maintenance-hygiene.md`

All items above are now implemented in this branch.

## Working Rule

Fix one document at a time.
Only mark items complete after:
- local checks pass for the affected scope
- contracts are explicit (types + runtime behavior)
- docs are updated where behavior changed
