# Dispatch Envelope

- Session: `s-20260302-005`
- Workflow: `create-spec`
- Stage: `11-hardening-implementation`
- Delegate: `@sinfonica-coda`
- Date: `2026-03-02`

## Objective

Implement the two approved non-blocking hardening items from review:

1. Add a targeted test that exercises canonical `skill_path` + missing file existence enforcement in `normalizeCreateSpecRequest(...)`.
2. Tighten `validateCreateSpecTaskPrompt(...)` to validate expected value literals for `required_response_format` keys.

## Inputs

- Review verdict and findings: `.sinfonica/handoffs/s-20260302-005/return-06-rondo.md`
- Existing contracts: `src/workflow/create-spec-contracts.ts`
- Existing tests: `tests/workflow/create-spec-contracts.test.ts`

## Constraints

- Keep scope to these two hardening items only.
- Preserve current public contract names and deterministic field keys.
- Add or update tests first where practical, then implementation.
- Run focused tests and report command outcomes.

## Expected Outputs

1. Minimal code/test edits implementing both hardening items.
2. Return envelope with:
   - concise change summary,
   - modified artifact list,
   - validation evidence,
   - blockers/risks,
   - ready-for-review statement.

## Acceptance Criteria

- A test fails when canonical `skill_path` is used but skill file is missing from provided cwd.
- Task prompt validation enforces both key order and expected value literals.
- Updated tests pass.

## Execution Instruction

`@sinfonica-coda` please read and execute this dispatch envelope and write your return envelope in this same session directory.
