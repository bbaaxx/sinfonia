# Dispatch Envelope

- Session: `s-20260302-005`
- Workflow: `create-spec`
- Stage: `03-review-and-qa`
- Delegate: `@sinfonia-rondo`
- Date: `2026-03-02`

## Objective

Review the implementation delivered by `@sinfonia-coda` against the approved spec and acceptance criteria, verify quality and test evidence, and issue an approve/revise verdict.

## Inputs

- Approved spec: `.sinfonia/handoffs/s-20260302-005/spec-01-amadeus.md`
- Spec return envelope: `.sinfonia/handoffs/s-20260302-005/return-02-amadeus.md`
- Implementation return envelope: `.sinfonia/handoffs/s-20260302-005/return-04-coda.md`
- Workflow tracker: `.sinfonia/handoffs/s-20260302-005/workflow.md`

## Constraints

- Evaluate conformance to deterministic reporting fields: `status`, `blockers`, `next_action`, `approval_requirement`, `artifacts`.
- Validate explicit approval-gate behavior at dispatch and final reporting paths.
- Report findings with severity and clear remediation guidance when needed.
- Do not modify implementation code; produce review artifacts only.

## Expected Outputs

1. Review return envelope in this session directory including:
   - concise summary,
   - findings list with severity,
   - acceptance criteria pass/fail status,
   - blocker/risk assessment,
   - explicit approve/revise verdict.

## Acceptance Criteria

- Review addresses all implementation artifacts listed by Coda.
- Verdict is explicit and evidence-based.
- Any revisions requested are concrete and actionable.

## Execution Instruction

`@sinfonia-rondo` please read and execute this dispatch envelope and write your return envelope in this same session directory.
