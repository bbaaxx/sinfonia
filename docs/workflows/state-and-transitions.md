# State and Transitions

**Status:** Draft
**Last Updated:** 2026-02-26
**Scope:** Runtime state model and transition rules

Back to index: [Documentation Index](../index.md)

## Purpose

Define the runtime state machine used by workflow execution, including status values, transition behavior, and advancement rules.

## Audience

Maintainers and advanced users.

## Main Content

Sinfonia tracks workflow progress in a canonical `workflow.md` index. State is expressed at both workflow and step levels.

## Workflow state model

Workflow statuses:

- `created`
- `in-progress`
- `complete`
- `blocked`
- `failed`

Step statuses:

- `pending`
- `in-progress`
- `completed`
- `blocked`
- `failed`

## Primary transition path

Typical lifecycle:

1. `created` when the pipeline is initialized.
2. `in-progress` when step execution begins.
3. `complete` when all steps are completed and final approvals are recorded.

Failure and hold paths:

- `blocked` when execution is intentionally paused by unresolved dependencies or approval outcomes.
- `failed` when a non-recoverable error path is chosen (for example, abort).

Transition safety:

- Index manager enforces valid workflow status transitions and rejects invalid state rewinds.

## Step advancement rules

- Step files are discovered in order from `.sinfonia/workflows/<workflow>/steps/`.
- Active step pointer is represented by `currentStep` and `currentStepIndex` in frontmatter.
- `advanceStep` moves to the next step and updates workflow status.
- `completeStep` marks final completion when no next step exists.

## Session continuity

- Session IDs use `s-YYYYMMDD-HHMMSS` format by default when auto-generated.
- Resume operations derive current position from persisted workflow index and continue from there.
- Compaction support can inject continuity context to preserve execution intent across reduced context windows.

## Approval transitions

- Approved return envelopes advance the workflow.
- Rejected return envelopes hold progression and may generate revision handoffs.
- Approval decisions are appended to the workflow index for traceability.

## Persistence contract

The workflow index contains required frontmatter fields and structured sections for:

- goal,
- steps,
- artifacts,
- decisions,
- sessions,
- context.

Writes are performed atomically to protect state integrity during update failures.

## Constraints and Non-Goals

- This document describes runtime state semantics, not team-specific policy semantics.
- It does not define step content design; only execution and transition behavior.
- Manual editing of `workflow.md` is not the intended update path; use framework operations whenever possible.

## References and Evidence

- `packages/sinfonia/src/workflow/`
- `packages/sinfonia/src/workflow/types.ts`
- `packages/sinfonia/src/workflow/index-manager.ts`
- `packages/sinfonia/src/workflow/step-engine.ts`
- `packages/sinfonia/src/workflow/coordinator.ts`
- `packages/sinfonia/src/workflow/compaction.ts`
- `packages/sinfonia/src/workflow/resume.ts`
- `packages/sinfonia/tests/workflow/coordinator.test.ts`
- `packages/sinfonia/tests/workflow/index-manager.test.ts`
