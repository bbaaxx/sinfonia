# Component Model

**Status:** Draft
**Last Updated:** 2026-02-26
**Scope:** Major components, roles, and interfaces

Back to index: [Documentation Index](../index.md)

## Purpose

Define the major Sinfonia components, their responsibilities, and how they interact at runtime.

## Audience

Maintainers and contributors.

## Main Content

Sinfonia is organized into focused modules with explicit interfaces between orchestration, state, validation, and enforcement concerns.

## Component Catalog

### CLI Layer

`src/cli/program.ts`

- Defines command surface and argument contract.
- Routes command execution to specific command handlers.

`src/cli/init.ts`

- Bootstraps `.sinfonia/` project structure.
- Generates persona assets, workflow stubs, and enforcement plugin wiring.
- Supports interactive wizard and non-interactive modes.

`src/cli/validate.ts`

- Validates persona markdown structure/content.
- Produces per-file error/warning output and process exit status.

`src/cli/rules.ts`

- Lists current enforcement rules in table or JSON output.

### Workflow Runtime Layer

`src/workflow/coordinator.ts`

- Orchestrates pipeline lifecycle: init, dispatch, approval, failure handling, resume.
- Uses workflow-to-persona routing table for delegation.
- Treats most state-tracking failures as non-fatal to keep execution moving.

`src/workflow/step-engine.ts`

- Loads workflow definitions and individual step files.
- Advances and resumes step execution from persisted workflow state.

`src/workflow/index-manager.ts`

- Owns `workflow.md` creation, read/update operations, and append-style decisions/artifacts.
- Central persistence boundary for workflow session state.

### Handoff Layer

`src/handoff/writer.ts`

- Writes structured handoff envelopes with sequence/session metadata.

`src/handoff/reader.ts` + `src/handoff/validator.ts`

- Reads and validates envelopes for required fields and section structure.

`src/handoff/approval.ts`

- Applies approval/rejection outcomes and supports revision handoff creation.

### Enforcement Layer

`src/enforcement/registry.ts`

- Registers built-in rules and exposes listing/execution plumbing.

`src/enforcement/rules/*`

- Rule handlers for TDD gating, secret protection, compaction continuity, spec-stop warnings, shell env injection, and completeness warnings.

### Persona Layer

`src/persona/loader.ts` + `src/persona/stub-generator.ts`

- Loads persona definitions and generates framework persona artifacts.

`src/persona/delegation.ts`

- Formats delegation context and tracks delegation events.

### Config Layer

`src/config/loader.ts` + `src/config/schema.ts`

- Resolves config from defaults/project/env/flags.
- Validates keys and value constraints with strong typing.

## Interaction Boundaries

- CLI calls orchestration modules but does not directly manage workflow persistence internals.
- Coordinator delegates persistence operations to index manager rather than writing raw state itself.
- Enforcement remains hook-driven and separable from core workflow execution logic.
- Persona and validator modules are reused by both scaffold generation and runtime checks.

## Constraints and Non-Goals

- Component boundaries are code-level and process-level; they are not independent deployable services.
- The model optimizes maintainability in a single package, not distributed microservice decomposition.
- Not all modules are intended as public API surfaces; many are internal framework internals.

## References and Evidence

- `packages/sinfonia/src/`
- `packages/sinfonia/src/cli/program.ts`
- `packages/sinfonia/src/cli/init.ts`
- `packages/sinfonia/src/cli/validate.ts`
- `packages/sinfonia/src/cli/rules.ts`
- `packages/sinfonia/src/workflow/coordinator.ts`
- `packages/sinfonia/src/workflow/step-engine.ts`
- `packages/sinfonia/src/workflow/index-manager.ts`
- `packages/sinfonia/src/handoff/types.ts`
- `packages/sinfonia/src/handoff/writer.ts`
- `packages/sinfonia/src/handoff/approval.ts`
- `packages/sinfonia/src/enforcement/registry.ts`
- `packages/sinfonia/src/config/loader.ts`
