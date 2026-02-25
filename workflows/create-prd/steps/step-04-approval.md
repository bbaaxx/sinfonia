# Step 04 — Approval

**Persona**: Libretto | **Workflow**: create-prd | **Step**: 4 of 4

## Objective

Submit the validated PRD for stakeholder approval and handle the decision.

## Prerequisite

`prd-final.md` must exist and pass all validation checks from step 03.

## Actions

1. **Present** `prd-final.md` to the approver with a summary:
   - Feature name
   - Number of user stories
   - Number of functional requirements
   - Any notable constraints or risks

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
   - The workflow is complete. The PRD is ready for handoff to Amadeus (create-spec).

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
   - Address all rejection reasons before re-submitting.

## Output

Approval decision recorded. On approval: `prd-final.md` is the deliverable for the next workflow.

## Completion Signal

Workflow complete when `approved` decision is recorded. Rejected decisions restart the workflow.
