# Use Cases

**Status:** Draft
**Last Updated:** 2026-02-26
**Scope:** Primary scenarios and adoption patterns

Back to index: [Documentation Index](../index.md)

## Purpose

Describe where Sinfonia provides clear operational value, and help teams decide when orchestration workflows are worth adopting.

## Audience

Users and solution architects.

## Main Content

Sinfonia is most effective when teams need predictable multi-agent execution rather than one-off prompting.

### 1) Structured Spec-to-Implementation Delivery

Use Sinfonia to run a repeatable sequence from planning to coding review.

- `create-prd` routes to Libretto for product framing.
- `create-spec` routes to Amadeus for technical specification.
- `dev-story` routes to Coda for implementation execution.
- `code-review` routes to Rondo for review and quality assessment.

Why this works:

- Routing is explicit in the workflow coordinator, so handoffs are not ad hoc.
- Workflow state is persisted in `workflow.md`, so progress survives session boundaries.

### 2) Teams That Need Approval Gates and Auditability

Use Sinfonia when each major step must be reviewed before advancing.

- Return envelopes can be approved or rejected.
- Rejections trigger revision handoffs back to the same persona.
- Decisions and related artifacts are recorded in the workflow index.

Why this works:

- Review is part of the execution model, not an informal side process.
- Audit history remains attached to a single session index.

### 3) Guardrailed AI Development Environments

Use Sinfonia when teams need policy enforcement during agent execution.

- ENF-001 blocks write/edit calls without matching test changes in git diff.
- ENF-002 blocks access to sensitive credential files.
- ENF-003 and ENF-005 inject context for continuity and shell safety.
- ENF-004 and ENF-007 warn when workflows are incomplete.

Why this works:

- Rules are centrally registered and inspectable via `sinfonia rules`.
- Safeguards are applied during runtime hooks, not only in post-hoc review.

### 4) Project Bootstrap for Multi-Agent Collaboration

Use Sinfonia when starting a new repo that needs consistent orchestration conventions.

- `sinfonia init` creates `.sinfonia/` runtime structure.
- Persona artifacts are generated with both interactive and subagent profiles.
- Workflow command and skill stubs are generated under `.opencode/`.
- Enforcement plugin wiring is installed so rule hooks can run immediately.

Why this works:

- The bootstrap gives teams a shared score before implementation starts.
- New contributors inherit conventions instead of re-inventing process setup.

### 5) Resume and Recovery Across Long Sessions

Use Sinfonia when workflows span multiple sessions or compacted contexts.

- Workflow status and current step index are read from persisted state.
- Resume paths reconstruct execution position from workflow and compaction context.

Why this works:

- Recovery logic is built into coordinator and workflow modules.
- State continuity is tested in self-hosting acceptance scenarios.

## Constraints and Non-Goals

- Sinfonia is not intended for single-shot prompts where orchestration overhead adds no value.
- It does not replace CI/CD pipelines, issue trackers, or code review platforms.
- The framework provides enforcement hooks, but teams still define their own quality standards and thresholds.
- Use-case fit depends on workflow discipline; weak process definitions will reduce benefits.

## References and Evidence

- `packages/sinfonia/README.md`
- `packages/sinfonia/src/workflow/coordinator.ts`
- `packages/sinfonia/src/workflow/step-engine.ts`
- `packages/sinfonia/src/workflow/types.ts`
- `packages/sinfonia/src/handoff/types.ts`
- `packages/sinfonia/src/cli/init.ts`
- `packages/sinfonia/src/cli/program.ts`
- `packages/sinfonia/src/cli/rules.ts`
- `packages/sinfonia/src/enforcement/registry.ts`
- `packages/sinfonia/src/enforcement/rules/enf-001-tdd.ts`
- `packages/sinfonia/tests/self-hosting/acceptance.test.ts`
