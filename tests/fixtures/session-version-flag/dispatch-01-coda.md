---
handoff_id: s-20260224-120000-001
handoff_type: dispatch
session_id: s-20260224-120000
sequence: 1
source_persona: maestro
target_persona: coda
status: pending
created_at: 2026-02-24T12:00:00Z
word_count: 196
---

# Dispatch Envelope: session-version-flag#001

Source: @sinfonica-maestro → Target: @sinfonica-coda

## Artifacts

- Target implementation file: `src/cli/program.ts`
- Required test file: `tests/cli/version.test.ts`

## Task

Implement the `--version` flag for the Sinfonica CLI so that running `sinfonica --version` (or `sinfonica -V`) prints the version read from `package.json` in the format `sinfonica/x.y.z`.

## Context

- CLI entry point is `src/cli/program.ts`, which currently has `.version('0.0.0')` hardcoded.
- `package.json` version is currently `0.1.0`.
- Test framework is **vitest**.
- A unit test must be added at `tests/cli/version.test.ts`.
- Do not modify files unrelated to this story.

## Acceptance Criteria

1. `sinfonica --version` prints `sinfonica/x.y.z` where `x.y.z` is read from `package.json` at runtime.
2. `sinfonica -V` alias produces the same output.
3. Output format is exactly `sinfonica/<version>` (e.g. `sinfonica/0.1.0`).
4. Unit test added at `tests/cli/version.test.ts` covering both `--version` and `-V`.
5. Build passes (`npm run build` or equivalent) with no errors.
6. All pre-existing tests remain green.

## Constraints

- Read the version dynamically from `package.json` — do not hardcode it.
- Keep the change minimal and scoped to the version flag wiring and the new test file.
- Non-blocking: if any ancillary state tracking calls fail, log a warning and proceed.
