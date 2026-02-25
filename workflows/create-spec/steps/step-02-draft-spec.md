# Step 02 — Draft Technical Spec

**Persona**: Amadeus | **Workflow**: create-spec | **Step**: 2 of 4

## Objective

Produce a complete technical specification from the PRD analysis notes.

## Prerequisite

`spec-analysis-notes.md` must exist and be complete before starting this step.

## Actions

1. **Open** `spec-analysis-notes.md` and `prd-final.md`.

2. **Write the technical spec** using this structure:

   ```markdown
   # Technical Spec: <Feature Name>

   ## Overview
   <Architecture summary: components, data flow, key decisions>

   ## System Components
   ### <Component Name>
   - Responsibility: <what it owns>
   - Interface: <public API or contract>
   - Dependencies: <what it relies on>

   ## Data Model
   | Entity | Fields | Constraints |
   |--------|--------|-------------|
   | ...    | ...    | ...         |

   ## API Design
   ### <Endpoint or Function>
   - Input: <type/schema>
   - Output: <type/schema>
   - Errors: <error cases>

   ## Non-Functional Requirements
   | ID    | Requirement | Target |
   |-------|-------------|--------|
   | NFR01 | Latency     | p95 < 200ms |

   ## Implementation Notes
   - <Decision rationale>
   - <Known trade-offs>

   ## Open Questions
   - <Anything requiring stakeholder input>
   ```

3. **Trace every FR** from the PRD to at least one component, API, or data model entry.

4. **Resolve all ambiguities** from `spec-analysis-notes.md` with explicit design decisions.

## Output

`spec-draft.md` in the session working directory.

## Completion Signal

Proceed to step 03 when every PRD FR is traceable in the spec and all ambiguities are resolved.
