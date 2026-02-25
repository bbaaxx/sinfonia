# Step 01 — Review Code

**Persona**: Rondo | **Workflow**: code-review | **Step**: 1 of 4

## Objective

Review the implementation code against the technical spec for correctness, design quality, and spec compliance.

## Prerequisites

- Implementation files from the dev-story workflow
- `spec-final.md` from the create-spec workflow
- `verification-report.md` from the dev-story workflow

## Actions

1. **Read** `spec-final.md` to understand the intended design: components, interfaces, data model, NFRs.

2. **Read** each implementation file. For each file, check:

   | Check | Description |
   |-------|-------------|
   | Spec compliance | Does the implementation match the spec interfaces exactly? |
   | Error handling | Are all error cases handled? Non-blocking pattern used? |
   | Type safety | No untyped `any` without justification? |
   | Single responsibility | Each function/module has one clear purpose? |
   | No dead code | No commented-out code, unused imports, or debug statements? |
   | Import correctness | Types imported from canonical type files, not redefined? |

3. **Record findings** for each file:
   ```
   File: <path>
   Finding 1: [BLOCKER|CONCERN|SUGGESTION] <description>
   Finding 2: ...
   ```

   Severity levels:
   - **BLOCKER**: Spec violation, security issue, or broken contract — must fix before approval
   - **CONCERN**: Quality issue that should be addressed — may block depending on severity
   - **SUGGESTION**: Minor improvement — does not block approval

## Output

`code-review-findings.md` with per-file findings and severity classifications.

## Completion Signal

Proceed to step 02 when all implementation files have been reviewed and findings recorded.
