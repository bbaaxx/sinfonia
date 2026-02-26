# ADR-0001: Framework Scope and Local-First Boundary

**Status:** Accepted
**Date:** 2026-02-26
**Deciders:** Sinfonia maintainers
**Supersedes:** None
**Superseded By:** None

Back to index: [Documentation Index](../index.md)

## Context

Sinfonia coordinates multi-agent workflows, but it must remain understandable, inspectable, and easy to operate inside a normal repository. A hosted control plane or remote orchestration service would increase operational complexity and blur ownership boundaries.

## Decision

Sinfonia is defined as a local-first orchestration framework.

- Runtime assets live in repository-managed paths (for example, `.sinfonia/` and `.opencode/`).
- Session state and handoff artifacts are file-based and inspectable.
- CLI commands operate against local project context.

## Consequences

- Positive: predictable local behavior, straightforward debugging, and clear artifact ownership.
- Negative: no built-in multi-tenant service features or centralized hosted dashboard.
- Neutral: teams can still layer external systems around Sinfonia if needed.

## Alternatives Considered

1. Build Sinfonia primarily as a hosted SaaS orchestration platform.
2. Hybrid local + remote mandatory control-plane architecture.

## References and Evidence

- `packages/sinfonia/src/cli/init.ts`
- `packages/sinfonia/src/workflow/index-manager.ts`
- `packages/sinfonia/src/handoff/writer.ts`
- `packages/sinfonia/README.md`
