# Feature-Start Policy

## FS-1

**FS-1**: Anything that adds or changes product behavior MUST go through the full Spec Kit flow — `speckit-specify` → `speckit-clarify` → `speckit-plan` → `speckit-tasks` → `speckit-implement` — checked against `constitution.md` before implementation begins, per its own Compliance Review clause.

Rationale: Spec Kit's whole value is forcing product decisions to be made and written down before code exists — skipping it for anything with real behavioral ambiguity would quietly reintroduce the "decided in someone's head, never written down" problem this project's own docs (this one included) exist to avoid. But requiring a full spec cycle for a one-line typo fix would be process for its own sake, not a real compliance concern.

## FS-2

**FS-2**: A trivial fix with no behavior ambiguity (a typo, a one-line bug fix with an obviously correct resolution, anything where writing a spec first would only restate the diff) MUST skip the full Spec Kit flow and go straight to a normal commit.

Rationale: Spec Kit's whole value is forcing product decisions to be made and written down before code exists — skipping it for anything with real behavioral ambiguity would quietly reintroduce the "decided in someone's head, never written down" problem this project's own docs (this one included) exist to avoid. But requiring a full spec cycle for a one-line typo fix would be process for its own sake, not a real compliance concern.

## FS-3

**FS-3**: When genuinely unsure whether a change is trivial, it MUST be treated as non-trivial and go through the full Spec Kit flow — mirrors the bounded-vs-architectural distinction already used when brainstorming new work: when in doubt, take the heavier path.

Rationale: Spec Kit's whole value is forcing product decisions to be made and written down before code exists — skipping it for anything with real behavioral ambiguity would quietly reintroduce the "decided in someone's head, never written down" problem this project's own docs (this one included) exist to avoid. But requiring a full spec cycle for a one-line typo fix would be process for its own sake, not a real compliance concern.
