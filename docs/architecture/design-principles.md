# Design Principles

**Status:** Draft
**Last Updated:** 2026-02-26
**Scope:** Principles and constraints shaping implementation

Back to index: [Documentation Index](../index.md)

## Purpose

Capture the guiding principles behind Sinfonia so future changes preserve behavior consistency, safety, and maintainability.

## Audience

Contributors and maintainers.

## Main Content

## Core principles

### 1) Orchestrate through explicit contracts

Workflow and handoff behavior should be explicit and machine-checkable, not implied by prompt prose.

- Handoff envelopes use typed payload fields and known handoff types.
- Workflow state uses explicit status/step metadata in a canonical index.

Implication:

- New capabilities should extend typed contracts first, then update runtime behavior.

### 2) Keep state durable and centralized

Session continuity depends on one authoritative state artifact (`workflow.md`) managed by a dedicated module.

- Index writes are funneled through index-manager APIs.
- Decisions and artifacts are appended to the same state source.

Implication:

- Avoid side-channel state that bypasses index-manager semantics.

### 3) Fail soft on tracking, fail hard on invalid setup

Initialization failures are treated as blocking, while many runtime tracking failures are warning-level to avoid unnecessary pipeline collapse.

- `initPipeline` rethrows critical creation failures.
- Coordinator logs warnings for non-critical state-tracking failures and keeps runtime moving when possible.

Implication:

- Preserve graceful degradation for observability-related operations while protecting core startup invariants.

### 4) Enforce quality close to action

Quality and safety rules should run at runtime hooks where risky behavior is attempted.

- TDD and secret protections can block tool execution.
- Spec-stop and completeness checks surface warning signals during idle/session transitions.

Implication:

- Prefer proactive enforcement to post-hoc audit-only approaches.

### 5) Compose from small, testable modules

Sinfonia favors focused modules (CLI, workflow, handoff, persona, enforcement, config) with clear boundaries.

Implication:

- New features should be placed in the smallest responsible module and covered by targeted tests.

### 6) Preserve operator visibility

Operational behavior should remain inspectable through CLI output, workflow records, and rule listings.

- `sinfonia rules` makes active safeguards visible.
- Workflow and handoff artifacts make execution history auditable.

Implication:

- Any automation that hides state transitions without traceability is considered design debt.

### 7) Keep thematic language secondary to precision

Orchestral analogies can improve approachability, but they must never obscure technical meaning.

Implication:

- When in doubt, choose exact engineering terminology and keep metaphor minimal.

## Constraints and Non-Goals

- These principles guide framework evolution; they are not strict guarantees of every downstream integration.
- Not every principle has equal weight in every change; safety and correctness take priority over stylistic preferences.
- Principles do not replace automated tests, validation commands, or enforcement rules.

## References and Evidence

- `packages/sinfonia/src/`
- `specs/`
- `packages/sinfonia/src/workflow/coordinator.ts`
- `packages/sinfonia/src/workflow/index-manager.ts`
- `packages/sinfonia/src/workflow/types.ts`
- `packages/sinfonia/src/handoff/types.ts`
- `packages/sinfonia/src/enforcement/registry.ts`
- `packages/sinfonia/src/enforcement/rules/enf-001-tdd.ts`
- `packages/sinfonia/src/cli/rules.ts`
- `specs/SPEC-06-sinfonia-documentation-agent-primer.md`
- `specs/SPEC-07-sinfonia-documentation-artifact-map.md`
