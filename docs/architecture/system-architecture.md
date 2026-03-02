# System Architecture

**Status:** Draft
**Last Updated:** 2026-02-26
**Scope:** High-level architecture and boundaries

Back to index: [Documentation Index](../index.md)

## Purpose

Describe the runtime architecture of Sinfonica, including control flow, persistence boundaries, and enforcement touchpoints.

## Audience

Maintainers and contributors.

## Main Content

Sinfonica is a local-first TypeScript orchestration framework with a CLI entry surface, workflow runtime core, and policy enforcement layer.

### Architectural layers

1. Interface layer (CLI)

- `sinfonica init` scaffolds runtime and persona assets.
- `sinfonica validate` checks persona markdown contracts.
- `sinfonica rules` lists active enforcement rules.

2. Orchestration layer (workflow + handoff)

- Coordinator initializes and runs multi-step pipelines.
- Step engine discovers and loads step files from workflow definitions.
- Handoff system writes, reads, validates, and resolves approval decisions.
- Workflow index manager persists canonical session state in `workflow.md`.

3. Policy layer (enforcement)

- Registry manages rule definitions, severity, hooks, and handlers.
- Runtime hooks can block unsafe actions or inject continuity context.

4. Persona layer

- Persona loader and stub generator provide role-specific artifacts.
- Delegation context formatter packages handoff context for downstream agents.

### Runtime flow (high level)

1. A workflow session is initialized with goal, steps, and session ID.
2. Coordinator maps each workflow step to a persona and emits dispatch handoffs.
3. Subagent/persona returns envelopes with results and evidence.
4. Approval gate advances the workflow or creates a revision handoff.
5. Workflow index is updated with progress, decisions, and artifacts.
6. Enforcement hooks run throughout execution for quality and safety.

### Data and persistence boundaries

- Session state is stored in `.sinfonica/handoffs/<sessionId>/workflow.md`.
- Handoff envelopes are stored under session-specific handoff paths.
- Workflow definitions and step files are loaded from `.sinfonica/workflows/<name>/`.
- Config is resolved from defaults, project config, env vars, and CLI flags.

Atomicity and resilience:

- Workflow index writes are centralized and atomic.
- Coordinator treats most state-tracking failures as non-fatal, favoring runtime continuity with warnings.

### Extension surfaces

- Add workflow definitions by placing step files in workflow directories.
- Add/adjust enforcement behavior via registry-backed rule handlers.
- Extend persona profiles and delegation behavior through persona modules.

## Constraints and Non-Goals

- Architecture is optimized for repository-local orchestration, not a multi-tenant hosted service.
- The framework coordinates agent workflows; it does not replace application runtime architecture.
- Enforcement is powerful but only as complete as configured rules and workflow discipline.
- The orchestral terminology in docs is an analogy layer, not a separate technical abstraction.

## References and Evidence

- `packages/sinfonica/src/`
- `packages/sinfonica/tests/`
- `packages/sinfonica/src/cli/program.ts`
- `packages/sinfonica/src/cli/init.ts`
- `packages/sinfonica/src/workflow/coordinator.ts`
- `packages/sinfonica/src/workflow/step-engine.ts`
- `packages/sinfonica/src/workflow/index-manager.ts`
- `packages/sinfonica/src/handoff/writer.ts`
- `packages/sinfonica/src/handoff/approval.ts`
- `packages/sinfonica/src/handoff/validator.ts`
- `packages/sinfonica/src/enforcement/registry.ts`
- `packages/sinfonica/src/persona/loader.ts`
- `packages/sinfonica/tests/workflow/coordinator.test.ts`
