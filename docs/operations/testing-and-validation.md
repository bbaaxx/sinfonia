# Testing and Validation

**Status:** Draft
**Last Updated:** 2026-02-26
**Scope:** Test strategy, command set, and validation checks

Back to index: [Documentation Index](../index.md)

## Purpose

Define the standard verification routine for Sinfonia changes, including test strategy and practical command sequence.

## Audience

Contributors and maintainers.

## Main Content

## Test strategy

Sinfonia relies on layered testing:

- Unit and module tests for CLI, workflow, handoff, config, persona, and enforcement modules.
- Integration-oriented tests for workflow behavior and index persistence.
- Self-hosting acceptance tests for end-to-end orchestration contracts.

## Baseline validation commands

Run from `packages/sinfonia/`:

```bash
npm run build
npm test
```

Expected result:

- Build output generated under `dist/`
- Full test suite passes

## Focused validation examples

Run selected suites while iterating:

```bash
npm test -- tests/cli
npm test -- tests/workflow
npm test -- tests/self-hosting
```

Use focused runs during development, but require full `npm test` before merge/release.

## Documentation validation

For docs changes with behavior claims:

1. Confirm claim against source modules in `src/`.
2. Confirm matching expectation in `tests/` where available.
3. Ensure `References and Evidence` sections list concrete paths.

## Failure-path expectations

Some tests intentionally trigger errors and warnings to validate guardrails. Treat these logs as expected when tests still pass.

## Validation cadence

- During feature work: run focused suites frequently.
- Before review: run full build and full tests.
- Before release: run full tests and verify docs alignment with code state.

## Constraints and Non-Goals

- This guide documents local package validation, not organization-wide CI policy.
- It does not define performance benchmarking criteria.
- Passing tests do not replace manual review of documentation accuracy.

## References and Evidence

- `packages/sinfonia/tests/`
- `packages/sinfonia/vitest.config.ts`
- `packages/sinfonia/package.json`
- `packages/sinfonia/tests/cli/init.test.ts`
- `packages/sinfonia/tests/workflow/coordinator.test.ts`
- `packages/sinfonia/tests/workflow/index-manager.test.ts`
- `packages/sinfonia/tests/self-hosting/acceptance.test.ts`
