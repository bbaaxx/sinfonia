# Contributor Guide

**Status:** Draft
**Last Updated:** 2026-02-26
**Scope:** Development workflow, quality checks, and contribution standards

Back to index: [Documentation Index](../index.md)

## Purpose

Define the expected contribution workflow for Sinfonia code and documentation changes.

## Audience

Contributors and maintainers.

## Main Content

## Contribution flow

1. Create a focused branch for one change set.
2. Implement or update behavior in the smallest responsible module.
3. Add or update tests that prove the behavior.
4. Update relevant docs under `packages/sinfonia/docs/`.
5. Run quality checks before opening review.

## Repository areas

- CLI: `src/cli/`
- Workflow engine/state: `src/workflow/`
- Handoff protocol: `src/handoff/`
- Enforcement rules: `src/enforcement/`
- Persona modules: `src/persona/`
- Config and validation: `src/config/`, `src/validators/`
- Tests: `tests/`

## Quality gates

Run from `packages/sinfonia/`:

```bash
npm run build
npm test
```

Expected baseline:

- Build succeeds
- Test suite passes

## Working with enforcement

- Treat enforcement rules as first-class runtime policy.
- If behavior requires policy change, update both rule implementation and tests.
- Keep rule IDs stable when possible to preserve operator expectations.

## Working with workflows

- Keep workflow IDs and persona routing aligned with coordinator mappings.
- When adding/changing steps, update workflow markdown and step-engine expectations.
- Ensure approval and revision paths remain test-covered.

## Documentation expectations

- Update affected docs in the same change set as code behavior changes.
- Include path-based evidence references for major claims.
- Keep orchestral analogies subtle and technically precise.

## Review checklist for contributors

- Are contracts still explicit and typed?
- Are transition and persistence semantics preserved?
- Do tests cover both success and failure paths?
- Are docs aligned with current implementation behavior?
- Are enforcement side effects understood and documented?

## Constraints and Non-Goals

- This guide is for contributing to Sinfonia itself, not consuming Sinfonia in downstream repositories.
- It does not replace your org's branch protection or review policy.
- It does not define publishing/release governance beyond package-local checks.

## References and Evidence

- `packages/sinfonia/tests/`
- `packages/sinfonia/package.json`
- `packages/sinfonia/src/workflow/coordinator.ts`
- `packages/sinfonia/src/workflow/index-manager.ts`
- `packages/sinfonia/src/enforcement/registry.ts`
- `packages/sinfonia/tests/workflow/coordinator.test.ts`
- `packages/sinfonia/tests/cli/init.test.ts`
