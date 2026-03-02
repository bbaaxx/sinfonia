# Dispatch Envelope

- Session: `s-20260302-005`
- Workflow: `create-spec`
- Stage: `01-spec-authoring`
- Delegate: `@sinfonia-amadeus`
- Date: `2026-03-02`

## Objective

Produce a concise, implementation-ready technical specification for handling a routed maestro request that loads skill context from `.opencode/skills/sinfonia-create-spec/SKILL.md` and generates a task prompt for `sinfonia-maestro`.

## Inputs

- Skill instructions: `.opencode/skills/sinfonia-create-spec/SKILL.md`
- Normalized request and workflow state: `.sinfonia/handoffs/s-20260302-005/workflow.md`

## Constraints

- Keep scope limited to the request payload and orchestration behavior.
- Preserve deterministic stage reporting fields: status, blockers, next action, approval requirement, artifacts.
- Provide only planning/spec artifacts; do not edit implementation code.

## Expected Outputs

1. Spec artifact in this session directory.
2. Return envelope including:
   - summary of produced spec,
   - acceptance criteria check,
   - blockers/risks,
   - approve/revise recommendation.

## Acceptance Criteria

- Spec maps the five skill steps to explicit workflow stages and evidence requirements.
- Spec defines routing/delegation behavior and approval gates for each stage.
- Spec includes validation checklist matching requested output fields.
- Return envelope includes explicit approve/revise recommendation.

## Execution Instruction

`@sinfonia-amadeus` please read and execute this dispatch envelope and write your return envelope in this same session directory.
