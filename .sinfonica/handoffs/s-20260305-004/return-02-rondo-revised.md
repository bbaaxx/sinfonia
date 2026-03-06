---
return_id: return-02-rondo-revised
session_id: s-20260305-004
source_persona: maestro
created_at: 2026-03-05T22:48:00Z
status: completed
---

# Return: Advisory Items A1/A2 Addressed

## Summary

Addressed Rondo's advisory items A1 and A2 by adding comprehensive event handler tests.

## Changes Made

### A1: Added tool_call Handler Tests

Added 3 tests for the `tool_call` policy enforcement handler:

1. **Block mode test** — Verifies handler returns `{ block: true, reason }` when enforcement=block and tool not allowed in current phase
2. **Warn mode test** — Verifies handler calls `ctx.ui.notify` with warning but allows tool when enforcement=warn
3. **Sinfonica bypass test** — Verifies sinfonica tools bypass enforcement regardless of mode

### A2: Added Evidence Handler Tests

Added 3 tests for evidence lifecycle:

1. **session_start handler test** — Verifies handler is registered and processes without error
2. **tool_result persistence test** — Verifies evidence is persisted via `appendEntry("sinfonica:step-evidence", data)`
3. **session_compact/switch test** — Verifies reset handlers are registered and process without error

## Test Harness Enhancement

Updated `createApiHarness` to:
- Capture event handlers via `eventHandlers: Map<string, EventHandler[]>`
- Track `appendEntry` calls via `appendedEntries` array

## Files Modified

| File | Changes |
|------|---------|
| `surfaces/pi/index.ts` | Fixed `ctx?.cwd` usage in tool_call handler |
| `surfaces/pi/tests/phase7-policy-gating.test.ts` | Added 6 new event handler tests |

## Test Results

```
Test Files  65 passed (65)
Tests       603 passed (603) (+6 new tests)
Build       Success
```

## Acceptance Criteria

- [x] A1: tool_call handler has direct test coverage
- [x] A2: Evidence reconstruction/persistence has test coverage
- [x] All 603 tests pass
- [x] Build succeeds with no type errors
