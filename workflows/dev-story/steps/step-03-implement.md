# Step 03 — Implement

**Persona**: Coda | **Workflow**: dev-story | **Step**: 3 of 5

## Objective

Write the implementation code to make the failing tests from step 02 pass.

## ⚠️ CRITICAL: Tests Must Exist First

**Step 02 must be fully complete before starting this step.**
If the test file does not exist or tests are not failing cleanly, return to step 02 immediately.

## Prerequisite

- Test file from step 02 exists and all tests are failing cleanly
- `story-analysis.md` implementation task list is complete

## Actions

1. **Open** `story-analysis.md` and the test file from step 02.

2. **Implement each task** from the implementation task list:
   - Write the minimum code needed to make the tests pass
   - Follow the interfaces defined in `spec-final.md` exactly
   - Do not add functionality not covered by a test
   - Keep functions small and single-purpose

3. **Run tests after each task**:
   ```
   npm test -- <test-file-path>
   ```
   Watch tests turn green one by one.

4. **Do not modify tests** to make them pass — fix the implementation instead.
   Exception: if a test has a genuine bug (wrong expectation), document the change.

5. **Follow project conventions**:
   - Non-blocking I/O: wrap async calls in try/catch
   - Import types from existing type files — do not redefine
   - Use `.js` extensions in imports (TypeScript ESM)

## Output

Implementation code with all tests from step 02 passing.

## Completion Signal

Proceed to step 04 when ALL tests from step 02 pass and no new test failures are introduced.
