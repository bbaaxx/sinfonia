# Types and Contracts

**Status:** Draft
**Last Updated:** 2026-02-26
**Scope:** Domain types, interfaces, and behavior contracts

Back to index: [Documentation Index](../index.md)

## Purpose

Document the core runtime types and behavioral contracts that define Sinfonia orchestration semantics.

## Audience

Contributors and integrators.

## Main Content

## Workflow contracts

Primary workflow types are defined in `src/workflow/types.ts`.

### `WorkflowStatus`

- `created`
- `in-progress`
- `complete`
- `blocked`
- `failed`

### `StepStatus`

- `pending`
- `in-progress`
- `completed`
- `blocked`
- `failed`

### `WorkflowStep`

Contract fields include:

- `id`, `name`, `status`, `owner`, `dependsOn`, `notes`

Behavioral contract:

- Step updates should preserve ordering and dependency semantics.

### `WorkflowFrontmatter`

Required fields include:

- `workflow`, `session`, `status`, `currentStep`, `currentStepIndex`, timestamps

Behavioral contract:

- Frontmatter drives runtime resume and advancement decisions.

### `WorkflowIndex`

Aggregate contract includes:

- frontmatter
- goal
- steps
- artifacts
- decisions
- sessions
- context
- rawBody

Behavioral contract:

- This is the canonical persisted execution state for a session.

## Handoff contracts

Primary handoff types are defined in `src/handoff/types.ts`.

### `HandoffType`

- `dispatch`
- `return`
- `revision`
- `direct`

### `HandoffPayload`

Contains structured execution context, for example:

- objective, summary, constraints, completion assessment, blockers, recommendations, evidence, next steps

Behavioral contract:

- Payload must remain machine-readable and sufficient for downstream continuation.

### `WrittenHandoff` / `ParsedHandoffEnvelope`

Behavioral contract:

- Envelopes require typed metadata and required markdown sections validated by handoff validator logic.

## Enforcement contracts

Registry behavior in `src/enforcement/registry.ts` defines:

- rule identity (`id`, `name`, `description`)
- severity (`blocking`, `advisory`, `injection`)
- hook binding and execution handler

Behavioral contract:

- Blocking rules can deny unsafe operations.
- Advisory rules emit warnings without aborting execution.
- Injection rules add runtime context for safer continuity.

## CLI behavioral contracts

- `init`: scaffold project runtime assets
- `validate`: enforce persona markdown correctness
- `rules`: expose active enforcement registry

Exit code contracts:

- validation returns non-zero on errors
- informational commands return zero under normal operation

## Stability notes

- These contracts are internal framework contracts unless otherwise documented as public API.
- Changes to core types should be accompanied by test updates and documentation updates.

## Constraints and Non-Goals

- This page is a semantic contract guide, not a generated typedoc dump.
- It does not list every helper type in the codebase.
- External integrators should treat undocumented internals as subject to change.

## References and Evidence

- `packages/sinfonia/src/`
- `packages/sinfonia/tests/`
- `packages/sinfonia/src/workflow/types.ts`
- `packages/sinfonia/src/workflow/index-manager.ts`
- `packages/sinfonia/src/handoff/types.ts`
- `packages/sinfonia/src/handoff/validator.ts`
- `packages/sinfonia/src/enforcement/registry.ts`
- `packages/sinfonia/src/cli/program.ts`
- `packages/sinfonia/tests/workflow/index-manager.test.ts`
- `packages/sinfonia/tests/self-hosting/acceptance.test.ts`
