# Step 04 — Approval

**Persona**: Rondo | **Workflow**: code-review | **Step**: 4 of 4

## Objective

Submit the review report for final decision and route the outcome appropriately.

## Prerequisite

`review-report.md` must exist with a clear APPROVED or REJECTED recommendation from step 03.

## Actions

1. **Present** `review-report.md` to the approver with a summary:
   - Recommendation (APPROVED / REJECTED)
   - Blocker count
   - Concern count
   - Key findings (top 3 if many)

2. **Request approval decision**: `approved` or `rejected`.

3. **On approval** (review passes):
   - Record the decision via the approval gate:
     ```
     applyApprovalDecision({
       decision: 'approved',
       reviewer: <approver name>,
       note: <optional comment>
     })
     ```
   - The workflow is complete. The implementation is approved.

4. **On rejection** (review fails — blockers must be fixed):
   - Record the decision via the approval gate:
     ```
     applyApprovalDecision({
       decision: 'rejected',
       reviewer: <approver name>,
       note: <blocker summary from review-report.md>
     })
     ```
   - **A revision handoff is automatically created** targeting Coda (dev-story workflow).
     The handoff envelope contains `review-report.md` as context so Coda knows exactly what to fix.
   - Coda must address all BLOCKERs and re-submit through the dev-story workflow before
     returning to code-review.

## ⚠️ Rejection Routing

A rejected review does NOT simply return an error. It triggers a structured revision cycle:
1. `applyApprovalDecision` with `decision: 'rejected'` creates a revision handoff envelope
2. The envelope is routed to Coda with the review report as context
3. Coda fixes the blockers and re-runs the dev-story workflow
4. The revised implementation returns to code-review for a new review cycle

## Output

Approval decision recorded. On approval: implementation is cleared. On rejection: revision handoff to Coda is created.

## Completion Signal

Workflow complete when `approved` decision is recorded. Rejected decisions trigger a Coda revision cycle.
