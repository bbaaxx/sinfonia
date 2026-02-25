# Step 05 — Approval

**Persona**: Coda | **Workflow**: dev-story | **Step**: 5 of 5

## Objective

Submit the verified implementation for approval and handle the decision.

## Prerequisite

`verification-report.md` must exist with all ACs traced, all tests passing, and build clean.

## Actions

1. **Present** the implementation summary to the approver:
   - Story ID and title
   - Files created or modified
   - Test count (new tests added, total passing)
   - AC traceability (from `verification-report.md`)
   - Any deviations from spec

2. **Request approval decision**: `approved` or `rejected`.

3. **On approval**:
   - Record the decision via the approval gate:
     ```
     applyApprovalDecision({
       decision: 'approved',
       reviewer: <approver name>,
       note: <optional comment>
     })
     ```
   - The workflow is complete. Implementation is ready for handoff to Rondo (code-review).

4. **On rejection**:
   - Record the decision via the approval gate:
     ```
     applyApprovalDecision({
       decision: 'rejected',
       reviewer: <approver name>,
       note: <reason for rejection>
     })
     ```
   - Return to step 01 with the rejection note as new context.
   - Address all rejection reasons. If tests need updating, return to step 02 first.

## Output

Approval decision recorded. On approval: implementation files and `verification-report.md` are the deliverables.

## Completion Signal

Workflow complete when `approved` decision is recorded. Rejected decisions restart from step 01.
