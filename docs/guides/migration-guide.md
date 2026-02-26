# Migration Guide

**Status:** Draft
**Last Updated:** 2026-02-26
**Scope:** Migration guidance between significant versions or architecture shifts

Back to index: [Documentation Index](../index.md)

## Purpose

Provide a controlled path for upgrading Sinfonia consumers when contract-level behavior changes are introduced.

## Audience

Existing users upgrading from earlier versions.

## Main Content

No versioned migration tracks are published yet. Use the interim checklist below for safe adoption when upgrading snapshots or pre-release builds.

## Interim migration checklist

1. Pull latest package changes and rebuild:

```bash
npm install
npm run build
```

2. Re-run scaffold refresh if needed:

```bash
sinfonia init --force -y
```

3. Re-validate persona contracts:

```bash
sinfonia validate .sinfonia/agents --all
```

4. Verify enforcement inventory:

```bash
sinfonia rules
```

5. Compare workflow definitions and step files under `.sinfonia/workflows/` with your customized versions.
6. Re-run your project's integration flows and acceptance checks.

## Migration impact areas to inspect

- Workflow routing and step names
- Handoff schema/required fields
- Enforcement rule behavior
- Config key validity and defaults
- Generated persona and command stubs

## Forward policy

When Sinfonia publishes stable version-to-version breaking changes, this page should include:

- source version -> target version matrix,
- explicit breaking changes,
- scripted remediation steps,
- rollback guidance.

## Constraints and Non-Goals

- This page currently provides interim guidance, not a full semantic version migration matrix.
- It assumes local repository control and ability to rerun scaffold commands.
- It does not define release policy; it documents upgrade behavior only.

## References and Evidence

- `packages/sinfonia/docs/index.md`
- `packages/sinfonia/src/cli/init.ts`
- `packages/sinfonia/src/cli/validate.ts`
- `packages/sinfonia/src/cli/rules.ts`
- `packages/sinfonia/src/config/schema.ts`
