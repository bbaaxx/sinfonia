# Sinfonia Documentation Style Guide

**Status:** Active
**Last Updated:** 2026-02-26
**Scope:** Voice, tone, structure, and consistency rules for `packages/sinfonia` documentation

## Purpose

Keep Sinfonia docs clear for developers and users while preserving a subtle orchestral identity.

## Core Voice

- Clear, direct, and technical first.
- Friendly and practical, never theatrical.
- Musically themed when it adds clarity, not decoration.

## Thematic Rules (Subtle Orchestra Theme)

- Use orchestral analogies sparingly: conductor, score, section, tempo, cue.
- Apply analogy only when it improves understanding of roles, sequencing, or coordination.
- Keep technical terms exact for commands, APIs, config, and troubleshooting.
- If analogy could confuse meaning, remove it and use plain language.

## Preferred Analogy Map

- Conductor -> Coordinator or control layer
- Score -> Plan, workflow, or specification
- Sections -> Subsystems or agent groups
- Tempo -> Execution pace or cadence
- Cue -> Trigger or handoff signal

## Tone By Document Type

- Reference docs: almost entirely plain technical language.
- Guides: plain language with light analogy in intros or transitions.
- Architecture docs: analogy acceptable when describing boundaries and coordination.
- Troubleshooting docs: plain language first, no metaphor in step-by-step fixes.

## Good vs Bad Examples

Good:

```md
The workflow index acts as the score for a session: it records planned steps, decisions, and artifacts.
```

Why good:

- Metaphor clarifies the artifact's role.
- Sentence still states exact technical function.

Bad:

```md
The glorious conductor sings commands to a symphony of autonomous minds that dance through destiny.
```

Why bad:

- Overly poetic and ambiguous.
- Does not describe behavior in verifiable terms.

## Writing Rules

- Lead with what the system does, then why it matters.
- Keep headings concrete and searchable.
- Favor short sections and copy-paste-safe examples.
- Use one canonical term per concept; define it in the glossary.
- Mark unknowns explicitly; do not invent behavior.

## Document Skeleton

Use this default structure for major docs:

1. Purpose
2. Audience
3. Main Content
4. Constraints and Non-Goals
5. References and Evidence

## Formatting Guidance

- Sentence case headings.
- Bullets for procedures and lists.
- Tables only for dense comparison/reference content.
- Keep code snippets minimal and executable where possible.

## Evidence Rule

Major behavior claims must reference at least one of:

- `packages/sinfonia/src/...`
- `packages/sinfonia/tests/...`
- Relevant files in `specs/`

Root-level evidence from `_bmad-output/` and `.tmp/` may be used for rationale and decision history.

## Review Checklist

- Is this understandable to a new contributor?
- Is every claim technically verifiable?
- Are metaphors subtle and useful?
- Are commands and paths accurate?
- Is language consistent with glossary terms?

## References and Evidence

- `specs/SPEC-06-sinfonia-documentation-agent-primer.md`
- `specs/SPEC-07-sinfonia-documentation-artifact-map.md`
- `packages/sinfonia/README.md`
- `packages/sinfonia/docs/index.md`
