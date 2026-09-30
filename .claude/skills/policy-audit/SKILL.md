---
name: policy-audit
description: Checks self-verifiable obligations in .policy/compliance-audit.md against live repo state and files a GitHub issue for each one currently unmet. Use this as an automated CI step on push to main, not interactively or conversationally — there is no live user to ask questions of mid-run.
---

# Auditing self-checkable policy obligations

## Overview
Checks the CA-* obligations in `.policy/compliance-audit.md` against actual repo
content — existence/pattern only, never sufficiency — and files a GitHub issue for
each currently unmet. Runs unattended in CI; there is no user to ask questions of
mid-run. If something is ambiguous, fail loud (non-zero exit, clear log line) rather
than guessing or skipping silently.

## Scope
Only obligations listed in `.policy/compliance-audit.md`'s "What gets checked"
section. Never CA-7's exclusion (`branch-protection.md`'s BP-*) or anything else
needing credentials beyond what this CI job already has — treating a permission
error as "passing" would be worse than not checking it.

## Implementation

The checks are implemented as a plain script — `.github/scripts/policy-audit.sh` —
invoked by the `compliance-audit` job in `.github/workflows/ci.yml` on push to
`main`. This skill documents the contract; the script is the actual, authoritative
implementation. There is no separate agent-run procedure to keep in sync with it.

If `.policy/compliance-audit.md`'s obligations change (an ID added, removed, or
reworded), update `.github/scripts/policy-audit.sh` in the same change — treat any
mismatch between the script and the policy file as a bug in the script, fix it there.

The script's behavior, for reference:
- Runs each CA-N's check (file/pattern existence only, never sufficiency).
- For each failing obligation: checks for an open issue labeled `process-hygiene`
  whose title contains that ID before filing a new one, so reruns don't duplicate.
- For each passing obligation: does nothing. Never auto-closes a matching open
  issue — closing means a human confirmed the fix is actually sufficient, not just
  that the existence-check flipped to pass (see `compliance-audit.md`'s "what this
  does not do" boundary).
- Always exits 0, regardless of findings — this must never fail the build (see
  `.policy/compliance-audit.md`, "How it runs"). Logs one line per obligation either
  way (pass, filed, or already tracked) so the CI log is a readable audit trail.

## What this is not
Not a substitute for building the missing thing. Not a sufficiency check. Not
scheduled on a timer and not run on every PR — only on push to `main`, as a step in
`.github/workflows/ci.yml`.
