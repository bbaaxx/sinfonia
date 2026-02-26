# Error and Recovery

**Status:** Draft
**Last Updated:** 2026-02-26
**Scope:** Failure modes, warnings, and recovery patterns

Back to index: [Documentation Index](../index.md)

## Purpose

Describe common runtime failure patterns and the supported recovery paths for Sinfonia workflows.

## Audience

Users, maintainers, and support engineers.

## Main Content

Sinfonia distinguishes between blocking failures and recoverable operational warnings. The coordinator and enforcement layers provide structured handling paths.

## Error classes

### Initialization errors (blocking)

- Invalid pipeline definitions (for example, empty or malformed workflow arrays).
- Missing workflow routing for unknown workflow IDs.
- Session/workflow index creation failures.

Expected behavior:

- Initialization errors throw and stop pipeline start.

### Dispatch and handoff errors

- Invalid dispatch arguments or missing persona routing.
- Envelope validation errors on return handoffs.
- Missing expected handoff files.

Expected behavior:

- Runtime surfaces clear error messages.
- Step progression is paused until corrected inputs are provided.

### State tracking errors (often non-fatal)

- Workflow index append/update failures during non-critical bookkeeping.

Expected behavior:

- Coordinator logs warnings and continues when core execution can proceed safely.

### Enforcement-triggered blocks

- TDD rule blocks write/edit/create operations without matching test changes.
- Secret protection blocks sensitive file access.

Expected behavior:

- Operation is denied with explicit message and remediation guidance.

## Recovery patterns

### Retry/skip/abort handling

Failure handling supports explicit control actions:

- `retry`: reattempt the current failure point
- `skip`: move past a step when policy allows
- `abort`: stop execution and mark terminal failure path

### Revision loop

- Rejected return envelopes generate revision handoffs.
- The same responsible persona receives corrective instructions.
- Workflow continues after revised output is approved.

### Resume from persisted state

- Resume operations read workflow index state and continue from `currentStepIndex`.
- Compaction-aware resume can use injected continuity context.

### Idempotent re-initialization

- `sinfonia init` can be rerun safely.
- `--force` refreshes generated artifacts while preserving key user config values.

## Diagnostic checklist

1. Confirm you are in the intended project root.
2. Run `sinfonia rules` and confirm expected safeguards are registered.
3. Validate personas with `sinfonia validate .sinfonia/agents --all`.
4. Inspect `.sinfonia/handoffs/<sessionId>/workflow.md` for current step and status.
5. Confirm required handoff envelopes exist and pass validation.
6. Re-run with explicit retry/skip/abort decision if a controlled failure branch is expected.

## Constraints and Non-Goals

- This guide covers framework runtime behavior, not host-tool or provider-specific outages.
- Some logs in tests are intentionally emitted for failure-path verification; treat test fixtures as expected behavior.
- Recovery does not bypass enforcement policy; blocked actions require compliant remediation.

## References and Evidence

- `packages/sinfonia/src/`
- `packages/sinfonia/tests/`
- `packages/sinfonia/src/workflow/coordinator.ts`
- `packages/sinfonia/src/workflow/resume.ts`
- `packages/sinfonia/src/workflow/compaction.ts`
- `packages/sinfonia/src/workflow/index-manager.ts`
- `packages/sinfonia/src/handoff/approval.ts`
- `packages/sinfonia/src/handoff/validator.ts`
- `packages/sinfonia/src/enforcement/registry.ts`
- `packages/sinfonia/src/enforcement/rules/enf-001-tdd.ts`
- `packages/sinfonia/tests/workflow/coordinator.test.ts`
- `packages/sinfonia/tests/workflow/index-manager.test.ts`
- `packages/sinfonia/tests/cli/init.test.ts`
