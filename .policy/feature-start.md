# Feature-Start Policy

**Anything that adds or changes product behavior goes through the full Spec Kit
flow** — `speckit-specify` → `speckit-clarify` → `speckit-plan` → `speckit-tasks` →
`speckit-implement` — checked against `constitution.md` before implementation begins,
per its own Compliance Review clause.

**A trivial fix with no behavior ambiguity skips straight to a normal commit** — a
typo, a one-line bug fix with an obviously correct resolution, anything where writing
a spec first would only restate the diff. This mirrors the bounded-vs-architectural
distinction already used when brainstorming new work: when in doubt, take the heavier
path (write the spec) rather than assume something is trivial.

Rationale: Spec Kit's whole value is forcing product decisions to be made and written
down before code exists — skipping it for anything with real behavioral ambiguity
would quietly reintroduce the "decided in someone's head, never written down" problem
this project's own docs (this one included) exist to avoid. But requiring a full spec
cycle for a one-line typo fix would be process for its own sake, not a real compliance
concern.
