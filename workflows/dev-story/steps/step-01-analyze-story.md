# Step 01 — Analyze Story

**Persona**: Coda | **Workflow**: dev-story | **Step**: 1 of 5

## Objective

Fully understand the development story and its technical context before writing any code or tests.

## Prerequisites

- An approved story (from the backlog or PM handoff) in the session envelope
- `spec-final.md` from the create-spec workflow

## Actions

1. **Read the story** in full. Extract:
   - Story title and ID
   - User-facing behaviour described
   - All acceptance criteria (AC)
   - Any referenced spec sections (component names, API signatures, data models)

2. **Read the relevant spec sections** from `spec-final.md`:
   - Locate every component, API, and data model entry referenced by the story
   - Note the exact interfaces (input types, output types, error cases)

3. **Identify implementation tasks**:
   ```
   Task 1: <what to build — component/function/module>
   Task 2: ...
   ```

4. **Identify test cases** from the acceptance criteria:
   ```
   Test 1: <AC → test description>
   Test 2: ...
   ```
   Include: happy path, error cases, edge cases.

5. **Check for blockers**: missing spec detail, unclear AC, or dependency on unimplemented work.
   If blockers exist, surface them before proceeding.

## Output

`story-analysis.md` in the session working directory containing:
- Story summary
- Implementation task list
- Test case list (derived from AC)
- Any blockers (must be empty to proceed)

## Completion Signal

Proceed to step 02 when `story-analysis.md` is complete and the blockers list is empty.
