---
name: policy-status
description: Lists every .policy/*.md file and, per obligation ID, how (if at all) it's actually enforced — CI-blocking, CI-checked non-blocking (policy-audit), human-verified only, or written policy with no technical check. Use this whenever the user asks what policies are in effect, wants an overview of this repo's process rules, or asks how a specific obligation is actually enforced or checked.
---

# Policy status overview

## Overview
Produces a table of every obligation across `.policy/*.md`: its ID, a short
statement, and its enforcement tier. Read-only — never edits `.policy/`,
`CONTRIBUTING.md`, `CLAUDE.md`, or anything else.

## Enforcement tiers, in priority order

1. **CI-blocking** — fails the build. E.g. `github.md`'s GH-3, backed by the
   `quality-gate` job's typecheck/lint/format/test steps in
   `.github/workflows/ci.yml`.
2. **CI-checked, non-blocking** — any obligation listed in
   `.policy/compliance-audit.md`'s "What gets checked" section (the CA-* IDs),
   verified by the `compliance-audit` job on push to `main` without failing the
   build. See `.github/scripts/policy-audit.sh` for the actual checks.
3. **Human-verified only** — any obligation in `.policy/branch-protection.md`
   (the BP-* IDs), or any obligation a CA-N explicitly excludes from its own
   scope the way CA-7 excludes BP-*.
4. **Written policy only** — everything else: a real rule, but nothing
   technical checks it. This is the default when an obligation doesn't match
   tiers 1–3, not a sign something's missing.

## Procedure

1. Read every `.policy/*.md` file. Extract each `<PREFIX>-N` obligation and its
   one-sentence statement.
2. Cross-reference against `.policy/compliance-audit.md`'s check list (tier 2)
   and `.policy/branch-protection.md` (tier 3). For tier 1, cross-reference
   `.github/workflows/ci.yml`'s blocking steps against what each obligation
   actually claims — this mapping is inferred, not self-declared by the
   obligation, so say explicitly when a mapping is a guess rather than
   presenting it as certain.
3. Present as a single table: `ID | Statement | Policy file | Enforcement`.
4. If an obligation doesn't obviously fit any tier, say so rather than forcing
   a guess — ask the user, don't silently default it to "written policy only."

## What this does not do
Doesn't judge whether an obligation *should* have stronger enforcement — that's
a design conversation, not a status report. Doesn't modify anything, and never
files issues (that's `policy-audit`'s job, not this one's).
