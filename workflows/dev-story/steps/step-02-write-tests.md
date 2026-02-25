# Step 02 — Write Tests

**Persona**: Coda | **Workflow**: dev-story | **Step**: 2 of 5

## Objective

Write all tests BEFORE writing any implementation code. This is mandatory — ENF-001 TDD enforcement is active.

## ⚠️ CRITICAL: Test-First Order

**You MUST complete this step entirely before starting step 03 (implement).**
Writing implementation code before tests are written and failing is a violation of ENF-001.
If you find yourself writing implementation logic, STOP and return to this step.

## Prerequisite

`story-analysis.md` must exist with a complete test case list and an empty blockers list.

## Actions

1. **Open** `story-analysis.md` and locate the test case list.

2. **Create the test file** at the path specified by the story or spec. Use the project's test framework (Vitest/Jest/etc.).

3. **Write one test per test case** from `story-analysis.md`:
   - Each test must be a failing test (implementation does not exist yet)
   - Use descriptive test names that map directly to acceptance criteria
   - Structure: `describe('<component/function>', () => { it('<AC description>', ...) })`
   - Include: happy path, error cases, edge cases

4. **Run the tests** to confirm they all fail for the right reason (not import errors):
   ```
   npm test -- <test-file-path>
   ```
   Expected: all tests fail with "not implemented" or similar — NOT with syntax/import errors.

5. **Fix any structural issues** (imports, test setup) until tests fail cleanly.

## Output

A test file with all tests written and failing cleanly. Test count matches the test case list in `story-analysis.md`.

## Completion Signal

Proceed to step 03 ONLY when:
- All tests are written
- All tests fail (implementation not yet written)
- No syntax or import errors exist
