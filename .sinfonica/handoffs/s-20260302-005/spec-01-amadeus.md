# Technical Specification: Routed `create-spec` Orchestration for `sinfonica-maestro`

## 1) Scope and Constraints

### In scope

- Request payload normalization for routed execution to `@sinfonica-maestro`.
- Skill-context loading from `.opencode/skills/sinfonica-create-spec/SKILL.md`.
- Deterministic orchestration and stage reporting for workflow `create-spec`.
- Task prompt generation contract for delegated execution.

### Out of scope

- Implementation code changes in orchestrator, router, or persona runtime.
- Any behavior outside request payload and orchestration/reporting lifecycle.

### Hard constraints

- Preserve deterministic stage fields in every stage report: `status`, `blockers`, `next_action`, `approval_requirement`, `artifacts`.
- Maintain explicit routing target: `sinfonica-maestro`.
- Planning artifacts only.

## 2) Component Boundaries and Ownership

- `Request Router` (owner: maestro ingress): parses raw user instruction and emits normalized request envelope.
- `Skill Loader` (owner: workflow runtime): resolves and validates skill file path, then loads skill steps.
- `Workflow Orchestrator` (owner: maestro): maps skill steps to workflow stages and controls stage transitions.
- `Delegation Prompt Builder` (owner: maestro): generates task prompt for target persona/subagent.
- `Stage Validator` (owner: maestro): validates stage outputs against acceptance checklist.
- `Reporting Publisher` (owner: maestro): emits deterministic stage status payload and artifact list.

Ownership is single-writer for stage state (`Workflow Orchestrator`) to avoid ambiguous responsibility.

## 3) Interface Contracts

### 3.1 Normalized request contract

```json
{
  "session_id": "s-20260302-005",
  "workflow": "create-spec",
  "target_persona": "sinfonica-maestro",
  "skill_path": ".opencode/skills/sinfonica-create-spec/SKILL.md",
  "request_text": "<original user request>",
  "required_report_fields": [
    "status",
    "blockers",
    "next_action",
    "approval_requirement",
    "artifacts"
  ]
}
```

Validation rules:

- `session_id`: non-empty, matches `^s-\d{8}-\d{3}$`.
- `workflow`: must equal `create-spec`.
- `target_persona`: must equal `sinfonica-maestro`.
- `skill_path`: must equal `.opencode/skills/sinfonica-create-spec/SKILL.md` and file must exist.
- `required_report_fields`: exact ordered set of five deterministic fields.

### 3.2 Task prompt artifact contract

```json
{
  "address_to": "@sinfonica-maestro",
  "workflow": "create-spec",
  "skill_context_path": ".opencode/skills/sinfonica-create-spec/SKILL.md",
  "request_context": "<normalized request summary>",
  "required_response_format": {
    "status": "string",
    "blockers": "string|None",
    "next_action": "string",
    "approval_requirement": "string",
    "artifacts": "string[]"
  }
}
```

Validation rules:

- `address_to` is exactly `@sinfonica-maestro`.
- `workflow` and `skill_context_path` are unchanged from normalized request.
- `required_response_format` includes all five deterministic fields.

### 3.3 Stage report contract

```json
{
  "stage_id": "string",
  "status": "pending|in_progress|awaiting_approval|complete|blocked",
  "blockers": "string|None",
  "next_action": "string",
  "approval_requirement": "required|not_required",
  "artifacts": ["path"]
}
```

Validation rules:

- `status=blocked` requires non-`None` `blockers`.
- `status=awaiting_approval` requires `approval_requirement=required`.
- `artifacts` lists created/updated files for that stage; empty list allowed only when no artifact is expected.

## 4) Skill-Step to Workflow-Stage Mapping

| Skill step                                        | Workflow stage ID         | Primary owner                                     | Evidence required                                             | Approval gate                                                               |
| ------------------------------------------------- | ------------------------- | ------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1) Parse and normalize request input              | `01-normalize-request`    | Request Router                                    | Updated workflow state with normalized request block          | `not_required`                                                              |
| 2) Build short execution plan                     | `02-plan`                 | Workflow Orchestrator                             | Execution plan section with ordered steps                     | `not_required`                                                              |
| 3) Execute workflow stages through persona chain  | `03-dispatch-and-execute` | Workflow Orchestrator + Delegation Prompt Builder | Dispatch envelope and task prompt artifact paths              | `required` before dispatch to next persona                                  |
| 4) Validate outputs against acceptance criteria   | `04-validate`             | Stage Validator                                   | Checklist result with pass/fail per criterion                 | `not_required` (becomes `required` only on failures needing human decision) |
| 5) Return concise result summary and next actions | `05-report`               | Reporting Publisher                               | Final return envelope with recommendation and artifact ledger | `required` for approve/revise decision                                      |

Decision: approval is explicitly enforced at stage 3 and stage 5 to minimize downstream execution risk and to make go/no-go decisions auditable.

## 5) Deterministic Data Flow

1. Ingest raw request and emit `NormalizedRequest`.
2. Resolve and load skill file; parse five canonical steps.
3. Build deterministic stage plan using fixed mapping table.
4. Generate dispatch envelope + task prompt for delegated persona.
5. Validate artifacts and response fields against acceptance checklist.
6. Publish return envelope containing pass/fail, risks/blockers, and approve/revise recommendation.

State transition invariant: stage order is strictly increasing (`01` -> `02` -> `03` -> `04` -> `05`); no stage skipping permitted.

## 6) Validation Checklist

Required checks before final handoff:

- Skill file read evidence present.
- Workflow state includes normalized request and execution plan.
- Dispatch envelope exists and targets `@sinfonica-amadeus`/assigned persona as planned.
- Task prompt exists and targets `sinfonica-maestro` with required response format.
- Stage reports contain: `status`, `blockers`, `next_action`, `approval_requirement`, `artifacts`.
- Return envelope includes explicit `approve` or `revise` recommendation.

## 7) Risks, Assumptions, Mitigations

- Risk: stage field drift (`approval required` vs `approval_requirement`) causes non-deterministic reporting.
  - Mitigation: enforce canonical key names at validation and fail stage 04 on mismatch.
- Risk: skill file path typo or relocation breaks workflow start.
  - Mitigation: hard-validate path existence before stage 02; emit blocked status with actionable next action.
- Risk: delegation target mismatch (persona name variants) misroutes execution.
  - Mitigation: strict enum validation for `target_persona` and `address_to`.

Assumption: current workflow lifecycle remains approval-gated at dispatch and final return.

## 8) Implementation Sequencing Guidance

1. Lock contracts (`NormalizedRequest`, `TaskPromptArtifact`, `StageReport`) first.
2. Implement/verify stage mapper against five-step skill sequence.
3. Implement validator checks for deterministic fields and acceptance criteria.
4. Gate dispatch and final report on explicit approval requirements.
5. Emit artifact ledger paths in every stage report for traceability.

This sequence minimizes integration risk by validating interfaces before orchestration behavior.
