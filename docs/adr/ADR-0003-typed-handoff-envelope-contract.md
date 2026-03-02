# ADR-0003: Typed Handoff Envelope Contract

**Status:** Accepted
**Date:** 2026-02-26
**Deciders:** Sinfonica maintainers
**Supersedes:** None
**Superseded By:** None

Back to index: [Documentation Index](../index.md)

## Context

Persona-to-persona delegation fails when handoffs are inconsistent, underspecified, or not machine-checkable. Free-form handoff text makes approval, revision, and automation fragile.

## Decision

Sinfonica handoffs use a typed envelope contract with explicit handoff types and required payload sections.

- Allowed handoff types are controlled (`dispatch`, `return`, `revision`, `direct`).
- Envelopes are written and read through dedicated handoff modules.
- Validation enforces required sections and schema expectations before acceptance.

## Consequences

- Positive: predictable delegation flow and safer automation across personas.
- Negative: stricter formatting can feel heavier than free-form notes.
- Neutral: teams can still add narrative detail as long as contract requirements are met.

## Alternatives Considered

1. Free-form markdown handoffs with minimal structure.
2. JSON-only envelopes without human-readable markdown sections.

## References and Evidence

- `packages/sinfonica/src/handoff/types.ts`
- `packages/sinfonica/src/handoff/writer.ts`
- `packages/sinfonica/src/handoff/reader.ts`
- `packages/sinfonica/src/handoff/validator.ts`
- `packages/sinfonica/tests/self-hosting/acceptance.test.ts`
