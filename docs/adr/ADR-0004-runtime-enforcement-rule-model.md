# ADR-0004: Runtime Enforcement Rule Model

**Status:** Accepted
**Date:** 2026-02-26
**Deciders:** Sinfonia maintainers
**Supersedes:** None
**Superseded By:** None

Back to index: [Documentation Index](../index.md)

## Context

Quality and safety checks are unreliable when they only run in post-hoc review. Sinfonia needs policy controls that can act during workflow execution.

## Decision

Sinfonia uses a registry-driven runtime enforcement model with hook-based rule execution and severity levels.

- Rules are centrally registered in an idempotent registry.
- Rule severities are explicit (`blocking`, `advisory`, `injection`).
- Built-in rules cover test-discipline, secret protection, and continuity context.

## Consequences

- Positive: safeguards run at the point of action, reducing avoidable failures.
- Negative: strict blocking policies can interrupt flow if teams are not prepared.
- Neutral: policy strictness can evolve through rule changes without redesigning workflow core.

## Alternatives Considered

1. Advisory-only checks with no blocking capability.
2. Hard-coded policy logic distributed across workflow modules.

## References and Evidence

- `packages/sinfonia/src/enforcement/registry.ts`
- `packages/sinfonia/src/enforcement/rules/enf-001-tdd.ts`
- `packages/sinfonia/src/enforcement/rules/enf-002-secrets.ts`
- `packages/sinfonia/src/enforcement/rules/enf-003-compaction-context.ts`
- `packages/sinfonia/src/cli/rules.ts`
