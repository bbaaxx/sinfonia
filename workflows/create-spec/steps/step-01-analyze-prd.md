# Step 01 — Analyze PRD

**Persona**: Amadeus | **Workflow**: create-spec | **Step**: 1 of 4

## Objective

Deeply understand the approved PRD before designing any technical solution. Do not write spec content yet.

## Prerequisite

An approved `prd-final.md` must be present in the session envelope or working directory.

## Actions

1. **Read** `prd-final.md` in full. For each functional requirement (FR), note:
   - What the system must do (behaviour)
   - What data is involved (inputs, outputs, state)
   - Any performance or reliability constraints implied

2. **Identify technical concerns** that the PRD does not address:
   - Data persistence strategy
   - API surface (internal vs external)
   - Error and edge-case handling
   - Security or access-control implications
   - Integration points with existing systems

3. **Map FRs to technical domains**:
   ```
   FR01 → domain: <e.g. auth, storage, API>
   FR02 → domain: ...
   ```

4. **Flag ambiguities** — any FR that cannot be implemented without a design decision:
   ```
   Ambiguity: FR03 — "fast response" undefined. Propose: p95 < 200ms.
   ```

## Output

`spec-analysis-notes.md` in the session working directory containing:
- FR-to-domain mapping
- List of technical concerns
- List of ambiguities with proposed resolutions

## Completion Signal

Proceed to step 02 when all FRs are mapped and all ambiguities have proposed resolutions.
