@sinfonica-maestro

Please execute workflow `create-spec` using skill context from `.opencode/skills/sinfonica-create-spec/SKILL.md`.

Request context:

- Parse and normalize request input.
- Build a short execution plan.
- Execute workflow stages through assigned persona chain.
- Validate outputs against acceptance criteria.
- Return concise summary and next actions.

User input to process:
"Route this request to @sinfonica-maestro and run workflow `create-spec`.

User input:
Load skill package: `.opencode/skills/sinfonica-create-spec/SKILL.md`. Use the above message and context to generate a prompt and call the task tool with subagent: sinfonica-maestro"

Required response format:

- Current stage status
- Blockers (or None)
- Next action
- Approval requirement
- Any artifacts/paths created
