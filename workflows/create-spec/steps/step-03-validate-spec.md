# Step 03 — Validate Spec

**Persona**: Amadeus | **Workflow**: create-spec | **Step**: 3 of 4

## Objective

Self-review the technical spec for completeness, consistency, and implementability before approval.

## Actions

1. **Open** `spec-draft.md` and `prd-final.md`.

2. **Run the validation checklist** — every item must be ✅ before proceeding:

   | # | Check | Status |
   |---|-------|--------|
   | 1 | Every PRD FR is traceable to ≥1 spec component or API | |
   | 2 | Every component has a defined interface (inputs/outputs) | |
   | 3 | Every NFR has a measurable target | |
   | 4 | No open questions remain unresolved | |
   | 5 | Data model covers all entities implied by FRs | |
   | 6 | Error cases are defined for every API endpoint/function | |
   | 7 | No circular dependencies between components | |

3. **Fix any failures** by editing `spec-draft.md` directly.

4. **Re-run the checklist** after each fix until all items are ✅.

5. **Rename** the validated file to `spec-final.md`.

## Output

`spec-final.md` in the session working directory, with all checklist items passing.

## Completion Signal

Proceed to step 04 when `spec-final.md` exists and all 7 checklist items are ✅.
