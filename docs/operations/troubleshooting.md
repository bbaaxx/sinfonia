# Troubleshooting

**Status:** Draft
**Last Updated:** 2026-02-26
**Scope:** Common issues, diagnostics, and resolution steps

Back to index: [Documentation Index](../index.md)

## Purpose

Provide practical diagnostics and fixes for common Sinfonica setup and runtime issues.

## Audience

Users, maintainers, and support engineers.

## Main Content

## Quick triage

Run these checks first:

```bash
sinfonica validate .sinfonica/agents --all
sinfonica rules
npm test
```

Then inspect:

- `.sinfonica/handoffs/<sessionId>/workflow.md`
- latest handoff envelopes in the same session folder

## Common issues and fixes

### 1) `sinfonica init` fails or creates incomplete scaffold

Symptoms:

- missing `.sinfonica/` folders
- missing `.opencode/agent` wrappers
- missing enforcement plugin file

Checks:

- verify write permissions in project root
- rerun with force refresh

```bash
sinfonica init --force -y
```

### 2) Persona validation fails

Symptoms:

- `sinfonica validate` returns non-zero
- errors in required persona sections/frontmatter

Checks:

- validate all persona files under `.sinfonica/agents`
- fix reported files/line sections

```bash
sinfonica validate .sinfonica/agents --all
```

### 3) Write/edit operations blocked by TDD enforcement

Symptoms:

- enforcement message indicates missing tests for changed source files

Why it happens:

- ENF-001 checks git diff for matching test-path candidates before allowing write/edit/create calls.

Fix:

- add/update tests in matching `.test` or `.spec` files for touched source paths, then retry.

### 4) Access blocked for sensitive files

Symptoms:

- read/list attempts on credential-like files are denied

Why it happens:

- ENF-002 protects high-risk paths (for example `.env`, keys, tokens).

Fix:

- avoid sensitive file operations and use secure secrets management.

### 5) Workflow appears stuck after rejection

Symptoms:

- workflow does not advance after return handoff

Checks:

- inspect approval decision in `workflow.md`
- confirm revision handoff was generated and completed
- ensure updated return envelope is valid

### 6) Resume behavior seems inconsistent after long sessions

Symptoms:

- step index or context feels out of sync after compaction/resume

Checks:

- verify `currentStep` and `currentStepIndex` in workflow frontmatter
- verify compaction/context entries in workflow state
- resume from latest persisted session artifacts

## Escalation package for maintainers

When raising an issue, include:

- command executed and full error output
- affected session ID
- relevant `workflow.md` excerpt
- related handoff envelope metadata
- whether enforcement rules were blocking/advisory at failure time

## Constraints and Non-Goals

- This playbook focuses on framework-level issues in Sinfonica.
- It does not cover provider outages, external API quotas, or unrelated tooling failures.
- Sensitive data should never be pasted into issue reports.

## References and Evidence

- `packages/sinfonica/src/`
- `packages/sinfonica/tests/`
- `packages/sinfonica/src/cli/init.ts`
- `packages/sinfonica/src/cli/validate.ts`
- `packages/sinfonica/src/workflow/coordinator.ts`
- `packages/sinfonica/src/workflow/index-manager.ts`
- `packages/sinfonica/src/enforcement/registry.ts`
- `packages/sinfonica/src/enforcement/rules/enf-001-tdd.ts`
- `packages/sinfonica/tests/cli/init.test.ts`
- `packages/sinfonica/tests/workflow/coordinator.test.ts`
