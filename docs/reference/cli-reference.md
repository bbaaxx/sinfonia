# CLI Reference

**Status:** Draft
**Last Updated:** 2026-02-26
**Scope:** Command reference for local and package CLI usage

Back to index: [Documentation Index](../index.md)

## Purpose

Provide a concise command reference for the `sinfonica` CLI, including behavior, options, and exit semantics.

## Audience

Developers and operators.

## Main Content

## Command entry

Binary:

- `sinfonica`

Version string format:

- `sinfonica/<package-version>`

## `sinfonica init`

Initializes Sinfonica scaffolding in the current working directory.

Creates or updates:

- `.sinfonica/` runtime directories and config
- `.sinfonica/agents/*.md` persona files
- `.opencode/agent/sinfonica-*.md` agent wrappers
- `.opencode/command/` and `.opencode/skills/` workflow stubs
- `.opencode/plugins/sinfonica-enforcement.ts`
- `opencode.json` agent entries

Options:

- `-y, --yes` run non-interactively with defaults
- `-f, --force` refresh generated artifacts that are normally preserved

Notes:

- Re-running without `--force` is idempotent for existing user-managed files.
- `config.yaml` user preferences are preserved on re-init, including with `--force`.

## `sinfonica validate <path>`

Validates persona markdown files.

Input:

- A file path or directory path.

Options:

- `--all` validate all persona files under the target path.

Exit behavior:

- returns `0` when no validation errors exist
- returns `1` when errors are found

## `sinfonica rules`

Lists currently registered enforcement rules.

Options:

- `--json` output machine-readable JSON

Exit behavior:

- informational command, returns `0`

## Typical usage sequence

```bash
sinfonica init -y
sinfonica validate .sinfonica/agents --all
sinfonica rules
```

## Constraints and Non-Goals

- This page documents current command behavior only; internal module APIs are covered elsewhere.
- CLI output examples are representative and may evolve across versions.
- Commands beyond `init`, `validate`, and `rules` are not part of the current public CLI contract.

## References and Evidence

- `packages/sinfonica/README.md`
- `packages/sinfonica/package.json`
- `packages/sinfonica/src/cli/program.ts`
- `packages/sinfonica/src/cli/init.ts`
- `packages/sinfonica/src/cli/validate.ts`
- `packages/sinfonica/src/cli/rules.ts`
- `packages/sinfonica/tests/cli/program.test.ts`
- `packages/sinfonica/tests/cli/init.test.ts`
- `packages/sinfonica/tests/cli/validate.test.ts`
- `packages/sinfonica/tests/cli/rules.test.ts`
