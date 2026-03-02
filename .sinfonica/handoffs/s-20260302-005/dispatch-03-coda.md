# Dispatch Envelope

- Session: `s-20260302-005`
- Workflow: `create-spec`
- Stage: `02-implementation`
- Delegate: `@sinfonica-coda`
- Date: `2026-03-02`

## Objective

Implement the approved orchestration spec in `.sinfonica/handoffs/s-20260302-005/spec-01-amadeus.md` by adding or adjusting runtime contracts and validation logic so routed `create-spec` execution remains deterministic and approval-gated.

## Inputs

- Approved spec: `.sinfonica/handoffs/s-20260302-005/spec-01-amadeus.md`
- Approved return: `.sinfonica/handoffs/s-20260302-005/return-02-amadeus.md`
- Workflow tracker: `.sinfonica/handoffs/s-20260302-005/workflow.md`

## Constraints

- Keep behavior changes scoped to what is required by the approved spec.
- Preserve existing workflow IDs and stable envelope key contracts.
- Use deterministic report fields: `status`, `blockers`, `next_action`, `approval_requirement`, `artifacts`.
- Add or update tests for changed behavior.
- Run focused tests while iterating; report validation commands and outcomes.

## Expected Outputs

1. Implementation changes in `src/` and related files as required.
2. Tests updated/added in `tests/` for all changed behavior paths.
3. Return envelope with:
   - implementation summary,
   - artifact list,
   - validation evidence (commands + pass/fail),
   - blockers/risks,
   - explicit ready-for-review statement.

## Acceptance Criteria

- Contracts for normalized request/task prompt/stage report align with approved spec.
- Approval gates remain explicit at dispatch and final reporting points.
- Deterministic field validation is enforced and covered by tests.
- Build passes and relevant tests pass, or blockers are explicitly documented.

## Execution Instruction

`@sinfonica-coda` please read and execute this dispatch envelope and write your return envelope in this same session directory.
