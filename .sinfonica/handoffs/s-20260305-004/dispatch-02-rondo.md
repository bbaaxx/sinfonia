---
dispatch_id: dispatch-02-rondo
session_id: s-20260305-004
target_persona: sinfonica-rondo
created_at: 2026-03-05T21:09:00Z
status: pending
---

# Dispatch: Code Review — Pi-Native Follow-Ups Implementation

## Task

Review the implementation of 5 deferred items from the Pi-Native Orchestration Refactor. Perform structured review against quality criteria and provide verdict.

## Context

Session `s-20260305-004` implemented 5 deferred items from the main Pi-native refactor (commit `d7b95e8`). Implementation is complete with 597 tests passing.

### Implementation Return Envelope
`.sinfonica/handoffs/s-20260305-004/return-01-coda.md`

## Items Implemented

| # | Item | Description |
|---|------|-------------|
| #2 | tool_call policy enforcement | Wired behind `pi_native_enforcement` config flag (warn/block/disabled) |
| #3 | Evidence persistence | Persist via `appendEntry`, reconstruct on `session_start`, reset on compact/switch |
| #5 | Real step slug resolution | `readWorkflowState` returns `stepSlugs` array extracted from stages |
| #6 | Case-sensitive wildcard fix | `toLowerCase()` in `startsWith` branch of `matchesToolPattern` |
| #7 | Command-path advance test | Test for `/sinfonica advance` warning when no evidence |

## Files to Review

| File | Lines Changed |
|------|---------------|
| `surfaces/pi/index.ts` | +59 lines (config loading, tool_call handler, evidence persistence) |
| `surfaces/pi/src/orchestration/phase-tools.ts` | +1 line (case fix) |
| `surfaces/pi/src/workflow-state.ts` | +22 lines (slug extraction) |
| `surfaces/pi/tests/phase7-policy-gating.test.ts` | +109 lines (new tests) |

## Review Criteria

### Correctness
- [ ] `tool_call` handler correctly returns `{ block: true, reason }` shape
- [ ] Config flag logic handles env var and file correctly
- [ ] Evidence persistence doesn't cause memory leaks or race conditions
- [ ] Slug extraction handles edge cases (missing stages, malformed titles)

### Pi API Compliance
- [ ] Event handlers don't call unsafe session control methods (`reload`, `waitForIdle`)
- [ ] `appendEntry` used correctly for persistence
- [ ] `ctx.ui.notify` called with correct signature

### Test Coverage
- [ ] New code paths have corresponding tests
- [ ] Edge cases covered (missing config, empty entries, malformed slugs)

### Code Quality
- [ ] Follows existing code style (kebab-case files, ESM imports)
- [ ] No `any` types introduced
- [ ] Error handling is appropriate

## Expected Outputs

1. Structured review findings with severity ratings
2. Verdict: APPROVE, APPROVE_WITH_NOTES, or REQUEST_REVISION
3. Any blocking issues that must be addressed before commit

## Return Envelope

Write your review to:
`.sinfonica/handoffs/s-20260305-004/return-02-rondo.md`

Include:
- Summary of review
- Findings by category (blocking, advisory, nitpick)
- Verdict and rationale
