# Step 02 — Draft PRD

**Persona**: Libretto | **Workflow**: create-prd | **Step**: 2 of 4

## Objective

Produce a complete first-draft PRD from the context notes gathered in step 01.

## Prerequisite

`prd-context-notes.md` must exist and be complete before starting this step.

## Actions

1. **Open** `prd-context-notes.md` from the session working directory.

2. **Write the PRD** using this structure:

   ```markdown
   # PRD: <Feature Name>

   ## Overview
   <2–3 sentences: problem, users, value>

   ## Goals
   - <measurable goal 1>
   - <measurable goal 2>

   ## Non-Goals
   - <explicit exclusion 1>

   ## User Stories
   ### Story 1: <title>
   As a <role>, I want <action> so that <outcome>.
   **Acceptance Criteria**:
   - [ ] <criterion>

   ## Functional Requirements
   | ID   | Requirement | Priority |
   |------|-------------|----------|
   | FR01 | ...         | Must     |

   ## Constraints
   - <constraint>

   ## Open Questions
   - <any remaining unknowns>
   ```

3. **Ensure every user story** has at least one testable acceptance criterion.

4. **Assign FR IDs** sequentially (FR01, FR02, …).

## Output

`prd-draft.md` written to the session working directory.

## Completion Signal

Proceed to step 03 when the draft covers all items from `prd-context-notes.md` and every FR has a priority.
