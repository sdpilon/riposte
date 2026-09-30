---
name: policy-audit
description: Use when running as an automated CI check (on push to main) to verify self-checkable obligations from .policy/compliance-audit.md against live repo state, and file GitHub issues for any found unmet. Not for interactive/conversational use.
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

## Procedure

1. Read `.policy/compliance-audit.md`. For each CA-N, run its check:

   | ID | Check |
   |----|-------|
   | CA-1 | release/versioning automation config present |
   | CA-2 | Dockerfile/docker-compose.yml or equivalent, plus self-host docs, present |
   | CA-3 | sanitization/prompt-injection handling present near the README-fetch path |
   | CA-4 | a credential-free demo/fake-data path exists |
   | CA-5 | no hardcoded personal-identity strings in `lib/`, `app/`, `components/` |
   | CA-6 | `CLAUDE.local.md` / `.claude/settings.local.json` exist and are untracked |

   If `.policy/compliance-audit.md`'s obligation list changes, update this table in
   the same change — it exists so the check logic and the policy don't drift apart;
   treat any mismatch between this table and the policy file as a bug in this file,
   fix it here.

2. For each failing obligation: check for an open issue labeled `process-hygiene`
   whose title contains that ID (`gh issue list --label process-hygiene --state open
   --search "<ID>"`). If found, skip. Otherwise file one: `gh issue create --label
   process-hygiene --title "<ID>: <short description>" --body "<what's missing, and
   a link to the obligation in .policy/compliance-audit.md>"`.

3. For each passing obligation: do nothing. Never auto-close a matching open issue —
   closing means a human confirmed the fix is actually sufficient, not just that the
   existence-check flipped to pass (see `compliance-audit.md`'s "what this does not
   do" boundary).

4. Exit 0 regardless of findings — this must never fail the build (see
   `.policy/compliance-audit.md`, "How it runs"). Log one line per obligation either
   way (pass, filed #N, or already tracked as #N) so the CI log is a readable audit
   trail even when nothing needs action.

## What this is not
Not a substitute for building the missing thing. Not a sufficiency check. Not
scheduled on a timer and not run on every PR — only on push to `main`, as a step in
`.github/workflows/ci.yml`.
