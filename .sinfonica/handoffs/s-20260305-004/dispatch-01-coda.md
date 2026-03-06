---
dispatch_id: dispatch-01-coda
session_id: s-20260305-004
target_persona: sinfonica-coda
created_at: 2026-03-05T21:05:00Z
status: pending
---

# Dispatch: Pi-Native Orchestration Follow-Ups — Implementation

## Task

Implement 5 deferred items from the Pi-Native Orchestration Refactor with TDD discipline. All items are actionable and well-scoped.

## Context

Session `s-20260305-003` completed the main Pi-native refactor (commit `d7b95e8`). This follow-up session addresses 8 deferred items. You are implementing the 5 highest-priority actionable items.

### Key Files

- `surfaces/pi/index.ts` — Main extension, where tool_call handler and evidence logic live
- `surfaces/pi/src/orchestration/policy.ts` — `evaluateToolCall`, `evaluateAdvanceRequest`, `resolveCurrentPhase`
- `surfaces/pi/src/orchestration/phase-tools.ts` — `matchesToolPattern`, `isToolAllowedInPhase`, `resolvePhaseFromStep`
- `surfaces/pi/src/workflow-state.ts` — `readWorkflowState` (needs slug extraction)
- `surfaces/pi/tests/phase7-policy-gating.test.ts` — Policy and evidence tests

## Items to Implement

### Item #2: Wire Full tool_call Policy Enforcement (HIGH PRIORITY)

**Problem:** `evaluateToolCall` is implemented and tested but NOT wired into the `tool_call` event handler. Non-sinfonica tools bypass phase-based restrictions.

**Solution:**
1. In `surfaces/pi/index.ts`, add a `tool_call` event handler
2. Call `evaluateToolCall` with current phase (from `resolveCurrentPhase`)
3. Return `{ block: true, reason }` if policy denies
4. Wire behind `pi_native_enforcement` config flag with values:
   - `"warn"` — Log warning via `ctx.ui.notify` but allow tool
   - `"block"` — Actually block the tool call
   - Default: no enforcement (current behavior)

**Config Location:** Read from `pi_native_enforcement` key in `.sinfonica/config.json` or env var `SINFONICA_PI_ENFORCEMENT`

**Test:** Add test for blocked tool_call in planning phase when enforcement=block

---

### Item #5: Real Step Slug Resolution (A1) — MEDIUM PRIORITY

**Problem:** `readActiveState` in `index.ts` produces synthetic slug (`"1-step"`) that bypasses slug-based phase classification. Line 407:
```typescript
currentStepSlug = `${state.currentStep}-step`;
```

**Solution:**
1. In `workflow-state.ts`, extend `readWorkflowState` to return the actual step slug
2. Parse the `steps` array from workflow index frontmatter or from the Stages section
3. Extract the slug for the current step index (e.g., `"gather-context"` from `"1-gather-context"`)
4. Update `WorkflowState` type to include `currentStepSlug: string`
5. Update `readActiveState` in `index.ts` to use the real slug

**Files to modify:**
- `surfaces/pi/src/workflow-state.ts` — Add slug extraction
- `surfaces/pi/index.ts` — Use real slug in `readActiveState`

**Test:** Add test verifying slug resolution from actual workflow.md content

---

### Item #6: Case-Sensitive Wildcard Matching Fix (A5) — LOW PRIORITY

**Problem:** In `phase-tools.ts`, `matchesToolPattern` applies `toLowerCase()` only in the exact match branch (line 69), but NOT in the `startsWith` branch (line 67). This causes `sinfonica_*` pattern to not match `Sinfonica_*`.

**Current code (line 66-68):**
```typescript
if (pattern.endsWith("*")) {
  return toolName.startsWith(pattern.slice(0, -1));
}
```

**Solution:**
```typescript
if (pattern.endsWith("*")) {
  return toolName.toLowerCase().startsWith(pattern.slice(0, -1).toLowerCase());
}
```

**Test:** Add test for case-insensitive wildcard matching

---

### Item #7: Command-Path Advance Test (A6) — LOW PRIORITY

**Problem:** No test for `/sinfonica advance` command path when evidence check fails.

**Solution:** Add test in `phase7-policy-gating.test.ts`:
1. Mock `readActiveWorkflowStatus` to return active state
2. Call command handler with `"advance"` action
3. Verify `ctx.ui.notify` is called with warning message when no evidence exists

**Test location:** `surfaces/pi/tests/phase7-policy-gating.test.ts`

---

### Item #3: Evidence Persistence Across Sessions — MEDIUM PRIORITY

**Problem:** Evidence accumulator (`currentStepEvidence`) is in-memory only. Lost on session restart.

**Solution:**
1. On `session_start`, reconstruct evidence from `appendEntry` records via `ctx.sessionManager?.getEntries()`
2. Filter entries with `customType === "sinfonica:step-evidence"` 
3. Also persist evidence updates via `pi.appendEntry?.("sinfonica:step-evidence", evidence)`
4. Subscribe to `session_compact` and `session_switch` events to reset evidence

**Files to modify:**
- `surfaces/pi/index.ts` — Add reconstruction and persistence

**Test:** Add test for evidence reconstruction from session entries

---

## Constraints

1. **TDD discipline:** Write failing tests first, then implement
2. **No core changes:** Only modify files under `surfaces/pi/`
3. **ESM + strict TS:** Follow existing patterns
4. **Run tests:** `npm test -- surfaces/pi/tests/phase7-policy-gating.test.ts`
5. **Full build:** Run `npm run build && npm test` before completion

## Expected Outputs

1. Updated `surfaces/pi/index.ts` with tool_call policy wiring
2. Updated `surfaces/pi/src/workflow-state.ts` with real slug extraction
3. Updated `surfaces/pi/src/orchestration/phase-tools.ts` with case-insensitive wildcard
4. Updated `surfaces/pi/tests/phase7-policy-gating.test.ts` with new tests
5. All existing tests continue to pass
6. Full build succeeds

## Acceptance Criteria

- [ ] Item #2: tool_call policy enforcement wired behind config flag
- [ ] Item #5: Real step slug extracted from workflow state
- [ ] Item #6: Case-insensitive wildcard matching
- [ ] Item #7: Command-path advance test added
- [ ] Item #3: Evidence persists across sessions
- [ ] All 594+ tests pass
- [ ] Build succeeds with no type errors

## Return Envelope

Write your completion summary to:
`.sinfonica/handoffs/s-20260305-004/return-01-coda.md`

Include:
- Items completed
- Files modified
- Test results
- Any issues or blockers encountered
