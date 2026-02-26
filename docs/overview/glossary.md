# Glossary

**Status:** Draft
**Last Updated:** 2026-02-26
**Scope:** Shared terminology for Sinfonia docs

Back to index: [Documentation Index](../index.md)

## Purpose

Define stable terms used across docs.

## Audience

All readers.

## Main Content

## Terms

Approval gate
: Decision point where a return handoff is approved or rejected before the workflow advances.

Artifact
: A recorded output produced during workflow execution (for example, document file, decision note, or review output) tracked in `workflow.md`.

Compaction
: Session context reduction event where Sinfonia can inject workflow continuity data so execution can resume accurately.

Conductor
: Documentation analogy for the orchestrator role that coordinates workflow steps and persona routing. In implementation, this maps to coordinator logic.

Coordinator
: Runtime orchestration layer that initializes pipelines, dispatches steps, processes approvals, handles failures, and supports resume flows.

Cue
: Documentation analogy for a trigger that hands control to another persona or step (for example, dispatching a workflow step).

Dispatch handoff
: Handoff envelope sent from source persona to target persona to start or continue a step.

Enforcement rule
: Runtime safeguard registered in the enforcement registry. Rules can block, warn, or inject context at specific hooks.

Envelope
: Structured markdown handoff file with frontmatter and required sections used for persona-to-persona exchanges.

Handoff
: Transfer of task context, constraints, and expectations between personas using typed envelopes (`dispatch`, `return`, `revision`, `direct`).

Maestro
: Default primary orchestrator persona in the framework. Coordinates work and delegates to specialist personas.

Persona
: Named execution role with defined responsibilities, permissions, and behavior constraints.

Revision handoff
: Follow-up handoff generated after rejection, requesting additional work from the prior executor.

Score
: Documentation analogy for canonical workflow definitions and state tracking artifacts that guide execution.

Session ID
: Unique identifier for a workflow run, used to scope handoff files and workflow index state.

Step engine
: Workflow module that discovers step markdown files, loads current/next steps, and advances completion state.

Tempo
: Documentation analogy for execution cadence, including how quickly steps move through approval and completion.

Workflow definition
: Files under `.sinfonia/workflows/<name>/` that describe a workflow and its ordered steps.

Workflow index
: Persistent `workflow.md` state file containing frontmatter, steps, artifacts, decisions, sessions, and context for a session.

Workflow status
: High-level state of the workflow (`created`, `in-progress`, `complete`, `blocked`, `failed`).

## Constraints and Non-Goals

- This glossary standardizes documentation terms; it is not a full API reference.
- Musical analogies are intentionally lightweight and must not override technical meanings.
- When a glossary term and implementation diverge, implementation terms in source code take precedence.

## References and Evidence

- `packages/sinfonia/docs/style-guide.md`
- `packages/sinfonia/src/workflow/types.ts`
- `packages/sinfonia/src/workflow/coordinator.ts`
- `packages/sinfonia/src/workflow/step-engine.ts`
- `packages/sinfonia/src/handoff/types.ts`
- `packages/sinfonia/src/enforcement/registry.ts`
