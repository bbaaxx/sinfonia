# ADR-0002: Workflow Index as Canonical Session State

**Status:** Accepted
**Date:** 2026-02-26
**Deciders:** Sinfonia maintainers
**Supersedes:** None
**Superseded By:** None

Back to index: [Documentation Index](../index.md)

## Context

Workflow execution spans multiple steps, approvals, and possible resumes. Without a single canonical state source, step progression and decision history diverge across modules.

## Decision

`workflow.md` is the canonical session state artifact, managed through the workflow index manager.

- State creation, read, and update operations route through `index-manager.ts`.
- Decisions and artifacts are appended to the same session index.
- Runtime behavior derives progression from persisted workflow index fields.

## Consequences

- Positive: durable, auditable, and resumable workflow state.
- Negative: requires disciplined writes through index-manager APIs; manual edits can cause drift.
- Neutral: additional state views can exist, but they are derived and non-canonical.

## Alternatives Considered

1. Keep workflow state only in memory during a session.
2. Split state across multiple ad hoc files per subsystem.

## References and Evidence

- `packages/sinfonia/src/workflow/index-manager.ts`
- `packages/sinfonia/src/workflow/types.ts`
- `packages/sinfonia/src/workflow/step-engine.ts`
- `packages/sinfonia/tests/workflow/index-manager.test.ts`
