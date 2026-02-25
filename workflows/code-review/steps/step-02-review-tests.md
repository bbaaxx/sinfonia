# Step 02 — Review Tests

**Persona**: Rondo | **Workflow**: code-review | **Step**: 2 of 4

## Objective

Review the test suite for coverage completeness, correctness, and alignment with acceptance criteria.

## Prerequisites

- Test files from the dev-story workflow
- `story-analysis.md` (test case list and AC mapping)
- `verification-report.md` (AC-to-test traceability table)

## Actions

1. **Read** `verification-report.md` to see the claimed AC-to-test traceability.

2. **Read** each test file. For each test, verify:

   | Check | Description |
   |-------|-------------|
   | AC coverage | Does every acceptance criterion have ≥1 test? |
   | Test correctness | Does the test actually verify the AC, or just pass trivially? |
   | Edge cases | Are error paths and boundary conditions tested? |
   | Test isolation | Tests do not depend on each other's state? |
   | Meaningful assertions | Assertions are specific, not just `expect(result).toBeTruthy()`? |
   | No implementation leakage | Tests test behaviour, not internal implementation details? |

3. **Verify the traceability table** in `verification-report.md`:
   - Confirm each claimed AC→test mapping is accurate
   - Flag any AC with no corresponding test as a BLOCKER

4. **Record findings**:
   ```
   Test file: <path>
   Finding 1: [BLOCKER|CONCERN|SUGGESTION] <description>
   ```

## Output

Append test review findings to `code-review-findings.md` under a `## Test Review` section.

## Completion Signal

Proceed to step 03 when all test files have been reviewed and findings appended to `code-review-findings.md`.
