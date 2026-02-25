# Step 04 — Verify

**Persona**: Coda | **Workflow**: dev-story | **Step**: 4 of 5

## Objective

Verify the complete implementation against the story acceptance criteria and ensure the build is clean.

## Actions

1. **Run the full test suite**:
   ```
   npm test
   ```
   All tests must pass — including pre-existing tests. Zero regressions allowed.

2. **Run the build**:
   ```
   npm run build
   ```
   Build must complete with zero errors and zero warnings.

3. **Trace each acceptance criterion** from the story to a passing test:
   ```
   AC1: <criterion> → test: '<test name>' ✅
   AC2: <criterion> → test: '<test name>' ✅
   ```
   Every AC must have a corresponding passing test.

4. **Check code quality**:
   - No `any` types without justification (TypeScript)
   - No commented-out code
   - No `console.log` left in production paths
   - All error cases handled (non-blocking pattern)

5. **Document any deviations** from the spec:
   - If implementation differs from `spec-final.md`, record why
   - Minor deviations are acceptable with justification; major deviations require re-approval

## Output

`verification-report.md` in the session working directory:
- AC-to-test traceability table
- Test count (new + total)
- Build status
- Any deviations from spec

## Completion Signal

Proceed to step 05 when all tests pass, build is clean, all ACs are traced, and `verification-report.md` is written.
