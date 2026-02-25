# Step 03 — Assess

**Persona**: Rondo | **Workflow**: code-review | **Step**: 3 of 4

## Objective

Synthesize all findings into a structured review report with a clear pass/fail recommendation.

## Prerequisite

`code-review-findings.md` must exist with both code and test review sections complete.

## Actions

1. **Open** `code-review-findings.md` and tally findings by severity:
   ```
   BLOCKER count: <N>
   CONCERN count: <N>
   SUGGESTION count: <N>
   ```

2. **Determine the recommendation**:
   - `APPROVED` — zero BLOCKERs, CONCERNs are acceptable or addressed
   - `REJECTED` — one or more BLOCKERs present, or CONCERNs deemed unacceptable

3. **Write the review report** as `review-report.md`:

   ```markdown
   # Code Review Report

   ## Summary
   - Recommendation: APPROVED | REJECTED
   - Blockers: <N>
   - Concerns: <N>
   - Suggestions: <N>

   ## Blockers (must fix before approval)
   1. <finding>

   ## Concerns (should address)
   1. <finding>

   ## Suggestions (optional improvements)
   1. <finding>

   ## Verdict
   <1–2 sentences explaining the recommendation>
   ```

4. **If REJECTED**: List every BLOCKER with enough detail for Coda to fix it without ambiguity.
   Each blocker entry must include:
   - File and line reference
   - What is wrong
   - What the correct behaviour should be

## Output

`review-report.md` in the session working directory with a clear APPROVED or REJECTED recommendation.

## Completion Signal

Proceed to step 04 when `review-report.md` is written with a clear recommendation and all blockers documented.
