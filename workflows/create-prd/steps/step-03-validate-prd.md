# Step 03 — Validate PRD

**Persona**: Libretto | **Workflow**: create-prd | **Step**: 3 of 4

## Objective

Self-review the PRD draft against a quality checklist before sending to approval.

## Actions

1. **Open** `prd-draft.md` from the session working directory.

2. **Run the validation checklist** — every item must be ✅ before proceeding:

   | # | Check | Status |
   |---|-------|--------|
   | 1 | Every user story has ≥1 testable acceptance criterion | |
   | 2 | Every FR has an ID and a priority (Must/Should/Could) | |
   | 3 | Non-Goals section explicitly lists ≥1 exclusion | |
   | 4 | No open questions remain unanswered | |
   | 5 | Goals are measurable (not vague aspirations) | |
   | 6 | Document is ≤2000 words | |

3. **Fix any failures** by editing `prd-draft.md` directly.

4. **Re-run the checklist** after each fix until all items are ✅.

5. **Rename** the validated file to `prd-final.md`.

## Output

`prd-final.md` in the session working directory, with all checklist items passing.

## Completion Signal

Proceed to step 04 when `prd-final.md` exists and all 6 checklist items are ✅.
