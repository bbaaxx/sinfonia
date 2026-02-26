# CLI Reference

**Status:** Draft
**Last Updated:** 2026-02-26
**Scope:** Command reference for local and package CLI usage

Back to index: [Documentation Index](../index.md)

## Purpose

Provide a concise command reference for the `sinfonia` CLI, including behavior, options, and exit semantics.

## Audience

Developers and operators.

## Main Content

## Command entry

Binary:

- `sinfonia`

Version string format:

- `sinfonia/<package-version>`

## `sinfonia init`

Initializes Sinfonia scaffolding in the current working directory.

Creates or updates:

- `.sinfonia/` runtime directories and config
- `.sinfonia/agents/*.md` persona files
- `.opencode/agent/sinfonia-*.md` agent wrappers
- `.opencode/command/` and `.opencode/skills/` workflow stubs
- `.opencode/plugins/sinfonia-enforcement.ts`
- `opencode.json` agent entries

Options:

- `-y, --yes` run non-interactively with defaults
- `-f, --force` refresh generated artifacts that are normally preserved

Notes:

- Re-running without `--force` is idempotent for existing user-managed files.
- `config.yaml` user preferences are preserved on re-init, including with `--force`.

## `sinfonia validate <path>`

Validates persona markdown files.

Input:

- A file path or directory path.

Options:

- `--all` validate all persona files under the target path.

Exit behavior:

- returns `0` when no validation errors exist
- returns `1` when errors are found

## `sinfonia rules`

Lists currently registered enforcement rules.

Options:

- `--json` output machine-readable JSON

Exit behavior:

- informational command, returns `0`

## Typical usage sequence

```bash
sinfonia init -y
sinfonia validate .sinfonia/agents --all
sinfonia rules
```

## Constraints and Non-Goals

- This page documents current command behavior only; internal module APIs are covered elsewhere.
- CLI output examples are representative and may evolve across versions.
- Commands beyond `init`, `validate`, and `rules` are not part of the current public CLI contract.

## References and Evidence

- `packages/sinfonia/README.md`
- `packages/sinfonia/package.json`
- `packages/sinfonia/src/cli/program.ts`
- `packages/sinfonia/src/cli/init.ts`
- `packages/sinfonia/src/cli/validate.ts`
- `packages/sinfonia/src/cli/rules.ts`
- `packages/sinfonia/tests/cli/program.test.ts`
- `packages/sinfonia/tests/cli/init.test.ts`
- `packages/sinfonia/tests/cli/validate.test.ts`
- `packages/sinfonia/tests/cli/rules.test.ts`
