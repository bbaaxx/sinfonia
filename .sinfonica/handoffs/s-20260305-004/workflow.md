---
workflow_id: pi-native-orchestration-followups
session_id: s-20260305-004
workflow_status: complete
current_step_index: 3
total_steps: 3
created_at: 2026-03-05T21:00:00Z
updated_at: 2026-03-05T22:48:00Z
---

# Pi-Native Orchestration — Deferred Items Follow-Up

- Workflow: pi-native-orchestration-followups
- Source: Session `s-20260305-003` (Pi-Native Orchestration Refactor)
- Overall Status: complete
- Current Stage: Phase 3 — Validation Complete

## Context

This session tracks deferred work items from the Pi-Native Orchestration Refactor (commit `d7b95e8`). All items are from Coda's recommendations and Rondo's advisory findings.

## Completed Items

| # | Item | Status |
|---|------|--------|
| #2 | Wire full tool_call policy enforcement | ✅ DONE |
| #3 | Evidence persistence across sessions | ✅ DONE |
| #5 | Real step slug resolution (A1) | ✅ DONE |
| #6 | Case-sensitive wildcard fix (A5) | ✅ DONE |
| #7 | Command-path advance test (A6) | ✅ DONE |

## Deferred Items (Future Work)

| # | Item | Priority |
|---|------|----------|
| #1 | TypeBox migration (M6) | High (requires Pi runtime testing) |
| #4 | Per-workflow phase maps | Low |
| #8 | Manual acceptance scenarios | TBD |

## Stages

1. Triage and prioritize items
   - Status: completed
   - Decision: Proceed with items #2, #5, #6, #7, #3

2. Implementation
   - Status: completed
   - Return: `.sinfonica/handoffs/s-20260305-004/return-01-coda.md`

3. Validation
   - Status: completed
   - Code Review: APPROVE_WITH_NOTES → A1/A2 addressed
   - Return: `.sinfonica/handoffs/s-20260305-004/return-02-rondo.md`
   - Revision: `.sinfonica/handoffs/s-20260305-004/return-02-rondo-revised.md`

## Decision Log

- 2026-03-05: Follow-up session created from s-20260305-003 completion. 8 open items tracked.
- 2026-03-05: Developer selected SP (Start Pipeline). Proceeding with items #2, #5, #6, #7, #3.
- 2026-03-05: Implementation complete. All 5 items delivered. 597 tests pass.
- 2026-03-05: Code review by Rondo: APPROVE_WITH_NOTES. Advisory items A1/A2 identified.
- 2026-03-05: Advisory items A1/A2 addressed. 6 new tests added. 603 tests pass.

## Artifacts

- `surfaces/pi/index.ts` — Config loading, tool_call handler, evidence persistence
- `surfaces/pi/src/orchestration/phase-tools.ts` — Case-insensitive wildcard
- `surfaces/pi/src/workflow-state.ts` — Step slug extraction
- `surfaces/pi/tests/phase7-policy-gating.test.ts` — 6 new event handler tests
