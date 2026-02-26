# Getting Started

**Status:** Draft
**Last Updated:** 2026-02-26
**Scope:** First-time setup and first successful run

Back to index: [Documentation Index](../index.md)

## Purpose

Help first-time users initialize Sinfonia in a repository and verify the setup end to end.

## Audience

New users and contributors.

## Main Content

## Prerequisites

- Node.js 20+
- npm available in your shell
- A repository where you want Sinfonia orchestration assets

## 1) Install dependencies

From `packages/sinfonia/`:

```bash
npm install
```

## 2) Build CLI output

```bash
npm run build
```

## 3) Initialize scaffolding

Run in the target project root:

```bash
sinfonia init -y
```

What this creates:

- `.sinfonia/` runtime directories and config
- `.sinfonia/agents/` persona markdown files
- `.opencode/agent/` wrappers for Sinfonia personas
- `.opencode/command/` and `.opencode/skills/` workflow stubs
- `.opencode/plugins/sinfonia-enforcement.ts`

## 4) Validate persona contracts

```bash
sinfonia validate .sinfonia/agents --all
```

Expected result:

- Validation passes with no errors.

## 5) Inspect active safeguards

```bash
sinfonia rules
```

Expected result:

- Rule list includes built-ins such as TDD, secrets, compaction context, and shell env injection hooks.

## 6) Verify generated workflow assets

Confirm workflow resources exist:

- `.opencode/command/create-prd.md`
- `.opencode/command/create-spec.md`
- `.opencode/command/dev-story.md`
- `.opencode/command/code-review.md`

At this point, your repository has the baseline score to run structured multi-agent execution.

## Constraints and Non-Goals

- This guide covers initial setup only; it does not define custom workflow authoring.
- It assumes shell access to the `sinfonia` CLI.
- If your environment does not expose the CLI on PATH, invoke it through your local runtime tooling.

## References and Evidence

- `packages/sinfonia/README.md`
- `packages/sinfonia/package.json`
- `packages/sinfonia/src/cli/init.ts`
- `packages/sinfonia/src/cli/validate.ts`
- `packages/sinfonia/src/cli/rules.ts`
- `packages/sinfonia/tests/cli/init.test.ts`
- `packages/sinfonia/tests/cli/validate.test.ts`
