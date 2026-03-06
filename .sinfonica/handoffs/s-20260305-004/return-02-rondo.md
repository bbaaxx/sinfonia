---
handoff_id: return-02-rondo
session_id: s-20260305-004
sequence: 3
source_persona: rondo
target_persona: maestro
handoff_type: return
status: complete
created_at: 2026-03-05T21:27:00Z
word_count: 812
---

# Return: Code Review — Pi-Native Follow-Ups Implementation

## Summary

Reviewed implementation of 5 deferred items from Pi-Native Orchestration Refactor. Build succeeds, all 597 tests pass. Implementation is functionally correct with no blocking issues. Several advisory items related to test coverage gaps for event handlers.

## Artifacts Reviewed

| File | Lines | Focus |
|------|-------|-------|
| `surfaces/pi/index.ts` | +59 | Config loading, tool_call handler, evidence persistence |
| `surfaces/pi/src/orchestration/phase-tools.ts` | +1 | Case-insensitive wildcard |
| `surfaces/pi/src/workflow-state.ts` | +22 | Slug extraction |
| `surfaces/pi/tests/phase7-policy-gating.test.ts` | +109 | New tests |

## Findings

### Blocking

None.

### Advisory (Medium Confidence)

| # | Item | Location | Issue | Remediation |
|---|------|----------|-------|-------------|
| A1 | Missing tool_call handler test | `phase7-policy-gating.test.ts` | The `createApiHarness` sets `on: () => {}`, so event handlers aren't registered during tests. No test verifies `tool_call` handler returns `{ block: true, reason }` in block mode. | Add dedicated test that spies on `pi.on` and invokes the registered handler directly with mock events. |
| A2 | Missing evidence reconstruction test | `phase7-policy-gating.test.ts` | No test verifies `session_start` correctly reconstructs evidence from `ctx.sessionManager.getEntries()`. | Add test with mock `getEntries()` returning persisted evidence entries, verify `currentStepEvidence` is restored. |
| A3 | Untyped config value | `index.ts:38` | `config.pi_native_enforcement` is extracted without runtime type validation. Current equality checks are safe but fragile. | Add explicit type guard or zod/typebox schema for config validation. |
| A4 | Stale evidence risk | `index.ts:422` | `currentStepEvidence` is module-level mutable state. If extension reloads without `session_start`, stale evidence could theoretically persist. | Low risk in practice (session lifecycle handles it), but consider explicit reset in extension registration. |

### Nitpick (Low Severity)

| # | Item | Location | Issue |
|---|------|----------|-------|
| N1 | Silent error catch | `index.ts:485` | `session_start` catch block silently ignores all reconstruction errors. Consider debug logging. |
| N2 | Type assertion | `index.ts:482` | `latest.data as Partial<StepEvidence>` assumes persisted shape matches current type. Safe given same codebase, but unvalidated. |

## Correctness Assessment

### Item #2: tool_call Policy Enforcement

- [x] Returns `{ block: true, reason }` in block mode (line 526)
- [x] Calls `ctx.ui.notify` in warn mode (line 529)
- [x] Config flag logic handles env var priority correctly (lines 28-31)
- [x] Config file fallback works with proper error handling (lines 34-44)
- [ ] **Gap**: No test exercises the tool_call handler directly

### Item #3: Evidence Persistence

- [x] Persists via `pi.appendEntry("sinfonica:step-evidence", ...)` (line 466)
- [x] Reconstructs from `ctx.sessionManager.getEntries()` (lines 476-483)
- [x] Resets on `session_compact` / `session_switch` (lines 494-500)
- [ ] **Gap**: No test verifies reconstruction path

### Item #5: Real Step Slug Resolution

- [x] `parseStages` extracts slugs from stage titles (lines 60-73)
- [x] Handles parenthetical parts like "(Amadeus)" (line 67)
- [x] Falls back to synthetic slug on parse failure (line 71)
- [x] `readActiveState` uses `stepSlugs[currentStep - 1]` (line 435)
- [x] Test coverage at lines 125-165

### Item #6: Case-Sensitive Wildcard Fix

- [x] `toLowerCase()` applied in `startsWith` branch (line 67)
- [x] Test coverage at lines 74-79 for `Sinfonica_*`, `SINFONICA_*`

### Item #7: Command-Path Advance Test

- [x] Test verifies warning shown when no evidence (lines 413-454)
- [x] Captures `notify` calls and asserts on warning message

## Pi API Compliance

| Check | Status | Evidence |
|-------|--------|----------|
| No `reload()` in event handlers | Pass | Handlers use only `appendEntry`, `notify`, `getEntries` |
| No `waitForIdle()` in event handlers | Pass | Not present in any handler |
| `appendEntry` signature correct | Pass | `(customType: string, data?: unknown) => void` |
| `ctx.ui.notify` signature correct | Pass | `(message: string, level?: "info" \| "warning" \| "error") => void` |

## Code Quality

| Check | Status | Notes |
|-------|--------|-------|
| No `any` types introduced | Pass | Uses `unknown` with type narrowing |
| ESM imports with `.ts` extension | Pass | Consistent with codebase |
| Error handling appropriate | Pass | ENOENT handled, catch blocks present |
| Style consistency | Pass | Matches existing patterns |

## Test Results

```
Test Files  65 passed (65)
Tests       597 passed (597)
Duration    2.79s
Build       Success
```

## Completion Assessment

**PASS** — Implementation meets acceptance criteria with no blocking defects.

## Blockers

None.

## Recommendations

1. **Optional**: Add unit tests for `tool_call` and `session_start` event handlers to close coverage gaps (A1, A2).
2. **Optional**: Add runtime type validation for config file parsing (A3).
3. **Low priority**: Consider debug logging in `session_start` catch block (N1).

## Verdict

**APPROVE_WITH_NOTES**

The implementation is correct, well-structured, and passes all tests. Advisory items are non-blocking test coverage gaps that don't affect runtime correctness. The code is safe to merge.
