# Product Overview

**Status:** Draft
**Last Updated:** 2026-02-26
**Scope:** What Sinfonica is, why it exists, and where it fits

Back to index: [Documentation Index](../index.md)

## Purpose

Explain what Sinfonica provides, the problems it solves in agentic development workflows, and how it is intended to be used in day-to-day engineering.

## Audience

Developers, maintainers, and evaluators.

## Main Content

Sinfonica is a TypeScript CLI framework for orchestrating multi-agent software workflows with explicit handoffs, workflow state tracking, and policy enforcement.

In practical terms, Sinfonica gives teams a reliable control layer for AI-assisted delivery:

- It initializes a project scaffold for agent collaboration (`sinfonica init`), including `.sinfonica/` runtime folders, persona artifacts, workflow command stubs, and enforcement plugin wiring.
- It validates persona markdown contracts (`sinfonica validate`) so role definitions stay machine-checkable.
- It exposes registered enforcement rules (`sinfonica rules`) so teams can inspect active safeguards.

At runtime, Sinfonica coordinates work as a pipeline:

- A coordinator (the "conductor") routes workflow steps to persona-specific executors.
- Work is exchanged through structured handoff envelopes.
- Session state is persisted in a canonical `workflow.md` index per session.
- Approval decisions and artifacts are appended to that index for traceability.
- Recovery mechanisms support resume and compaction-aware continuation.

Sinfonica also includes a built-in enforcement registry that can block unsafe operations (for example, secret file access or implementation without tests) and inject runtime context (for shell env and compaction continuity).

### Where Sinfonica Fits

Use Sinfonica when you need more than ad hoc prompting:

- Multi-step delivery with explicit delegation and review gates.
- Repeatable workflow execution across sessions.
- Auditable records of decisions and produced artifacts.
- Guardrails that keep agent behavior aligned with team standards.

### Product Shape Today

Current package shape emphasizes framework infrastructure over end-user app features:

- CLI entry points and project bootstrap logic.
- Workflow coordination and state index management.
- Handoff writing, reading, validation, and approval handling.
- Persona loading/stub generation and delegation context formatting.
- Enforcement rule registration and handlers.
- Strong automated test coverage across CLI, workflow, handoff, persona, validators, and enforcement layers.

### Why This Matters

Sinfonica reduces coordination drift in AI-driven development. Instead of each agent thread improvising its own process, the framework provides a shared score: same workflow model, same approval checkpoints, same traceable artifacts, and same enforcement expectations.

## Constraints and Non-Goals

- Sinfonica is an orchestration framework, not a replacement for your product-specific business logic.
- It does not guarantee quality by itself; enforcement and workflow definitions must still be configured thoughtfully.
- Metaphorical language in docs is intentionally subtle; operational usage should remain technically explicit.
- The package currently focuses on CLI and workflow infrastructure rather than a GUI or hosted control plane.

## References and Evidence

- `packages/sinfonica/README.md`
- `packages/sinfonica/package.json`
- `packages/sinfonica/src/cli/program.ts`
- `packages/sinfonica/src/cli/init.ts`
- `packages/sinfonica/src/cli/validate.ts`
- `packages/sinfonica/src/workflow/coordinator.ts`
- `packages/sinfonica/src/workflow/index-manager.ts`
- `packages/sinfonica/src/enforcement/registry.ts`
- `packages/sinfonica/tests/self-hosting/acceptance.test.ts`
