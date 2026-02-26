# Workflow Catalog

**Status:** Draft
**Last Updated:** 2026-02-26
**Scope:** Catalog of available workflows and intent

Back to index: [Documentation Index](../index.md)

## Purpose

Document available built-in workflows, their target personas, and their step sequences so teams can choose the right execution path.

## Audience

Users and contributors.

## Main Content

Sinfonia ships with four built-in workflows under `packages/sinfonia/workflows/`. Each workflow has a `workflow.md` definition and ordered step files.

## Built-in Workflows

### `create-prd`

- Target persona: `libretto`
- Goal: turn feature intent into an approved PRD
- Steps:
  1. `gather-context`
  2. `draft-prd`
  3. `validate-prd`
  4. `approval`

### `create-spec`

- Target persona: `amadeus`
- Goal: turn approved PRD content into a technical specification
- Steps:
  1. `analyze-prd`
  2. `draft-spec`
  3. `validate-spec`
  4. `approval`

### `dev-story`

- Target persona: `coda`
- Goal: deliver a story with test-first implementation and verification
- Steps:
  1. `analyze-story`
  2. `write-tests`
  3. `implement`
  4. `verify`
  5. `approval`

### `code-review`

- Target persona: `rondo`
- Goal: evaluate implementation quality against expected behavior
- Steps:
  1. `review-code`
  2. `review-tests`
  3. `assess`
  4. `approval`

## Routing and execution notes

- The workflow coordinator maps these workflow IDs to fixed persona routing.
- Step execution is sequential and tracked in `workflow.md` for each session.
- Approval outcomes determine whether the workflow advances or requests revision.
- Unknown workflow IDs fail fast at dispatch.

In orchestral terms, each workflow is a score with its own movement order; the coordinator keeps every section in time.

## Constraints and Non-Goals

- This catalog covers built-in workflows only; custom workflows must be documented by the adopting team.
- Step details and prompts live in workflow step files, not in this high-level catalog.
- Workflow names and persona mappings are implementation contracts; changing them requires code and documentation updates together.

## References and Evidence

- `packages/sinfonia/workflows/`
- `packages/sinfonia/src/`
- `packages/sinfonia/workflows/create-prd/workflow.md`
- `packages/sinfonia/workflows/create-spec/workflow.md`
- `packages/sinfonia/workflows/dev-story/workflow.md`
- `packages/sinfonia/workflows/code-review/workflow.md`
- `packages/sinfonia/src/workflow/coordinator.ts`
- `packages/sinfonia/src/workflow/step-engine.ts`
- `packages/sinfonia/tests/workflow/coordinator.test.ts`
