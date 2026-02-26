# Release Checklist

**Status:** Draft
**Last Updated:** 2026-02-26
**Scope:** Pre-release and release verification steps

Back to index: [Documentation Index](../index.md)

## Purpose

Provide a repeatable pre-release checklist so Sinfonia releases ship with validated behavior and aligned documentation.

## Audience

Maintainers and release owners.

## Main Content

## Pre-release checklist

Run from `packages/sinfonia/` unless noted.

### 1) Sync and dependency hygiene

- Pull latest target branch changes.
- Install dependencies cleanly.

```bash
npm install
```

### 2) Build and test gates

- Build package artifacts.
- Run full test suite.

```bash
npm run build
npm test
```

### 3) CLI contract sanity

- Verify CLI version output format.
- Verify command registration remains intact.

```bash
sinfonia --version
sinfonia rules
```

### 4) Scaffold and validation sanity

- Run init in a clean test workspace.
- Validate generated personas.

```bash
sinfonia init -y
sinfonia validate .sinfonia/agents --all
```

### 5) Enforcement visibility

- Confirm built-in rule IDs are listed and expected severities are present.
- Confirm no accidental rule removals/regressions.

### 6) Documentation alignment

- Ensure docs reflect current commands, workflow names, and status semantics.
- Ensure updated behavior has corresponding docs updates.
- Ensure references/evidence paths are still valid.

### 7) Package metadata sanity

- Confirm version and metadata in `package.json` are correct.
- Confirm publishable file set still includes required runtime assets.

### 8) Final release decision

- Proceed only if all checks pass.
- If any check fails, resolve and re-run full checklist.

## Optional hardening checks

- Run focused suites for changed domains (CLI, workflow, enforcement).
- Smoke test self-hosting acceptance flows.
- Verify no breaking changes in handoff/workflow contracts unless explicitly planned.

## Constraints and Non-Goals

- This checklist does not replace repository-level CI/CD policy.
- It does not cover publishing credentials or registry account management.
- It assumes maintainers can execute local CLI and test commands.

## References and Evidence

- `packages/sinfonia/package.json`
- `packages/sinfonia/tests/`
- `packages/sinfonia/src/cli/program.ts`
- `packages/sinfonia/src/cli/init.ts`
- `packages/sinfonia/src/cli/validate.ts`
- `packages/sinfonia/src/cli/rules.ts`
- `packages/sinfonia/src/enforcement/registry.ts`
- `packages/sinfonia/docs/index.md`
